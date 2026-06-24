const { Collection, InteractionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const logger = require('../utils/logger');
const { getGuild } = require('../db/guildRepository');
const { getDB } = require('../db/connection');
const config = require('../config');
const { isOwner, isWhitelisted } = require('../utils/securityEnforcer');
const { safeJsonParse } = require('../utils/helpers');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      
      if (!command) {
        logger.warn(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      // Guild-only check
      if (!interaction.guild) {
        return interaction.reply({ embeds: [
          new EmbedBuilder().setColor(0xed4245).setTitle('Guild Only').setDescription('This command can only be used in a server.')
        ], ephemeral: true });
      }

      // Blacklist check
      const guildData = await getGuild(interaction.guild.id);
      const blacklist = safeJsonParse(guildData.blacklist, []);
      if (blacklist.includes(interaction.user.id)) {
        return interaction.reply({ embeds: [
          new EmbedBuilder().setColor(0xed4245).setTitle('Access Denied').setDescription('You are blacklisted from using this bot.')
        ], ephemeral: true });
      }

      // Global owner bypass
      if (isOwner(interaction.user.id)) {
        // Owner bypasses all checks
      } else {
        // Owner only check
        if (command.ownerOnly) {
          return interaction.reply({ embeds: [
            new EmbedBuilder().setColor(0xed4245).setTitle('Access Denied').setDescription('This command is restricted to the bot owner.')
          ], ephemeral: true });
        }

        // Admin only check
        if (command.adminOnly) {
          const member = interaction.member;
          if (!member || !member.permissions.has('Administrator')) {
            return interaction.reply({ embeds: [
              new EmbedBuilder().setColor(0xed4245).setTitle('Access Denied').setDescription('This command requires **Administrator** permission.')
            ], ephemeral: true });
          }
        }

        // Moderator only check
        if (command.modOnly) {
          const member = interaction.member;
          const modPerms = ['ManageMessages', 'KickMembers', 'BanMembers', 'ManageGuild'];
          const hasModPerms = member && member.permissions.some(p => modPerms.includes(p));
          if (!hasModPerms) {
            return interaction.reply({ embeds: [
              new EmbedBuilder().setColor(0xed4245).setTitle('Access Denied').setDescription('This command requires moderator permissions.')
            ], ephemeral: true });
          }
        }

        // Staff only check
        if (command.staffOnly) {
          const member = interaction.member;
          const staffRoleId = guildData.role_staff;
          const isStaff = staffRoleId && member?.roles.cache.has(staffRoleId);
          const hasStaffPerms = member && (member.permissions.has('Administrator') || member.permissions.has('ManageGuild'));
          if (!isStaff && !hasStaffPerms) {
            return interaction.reply({ embeds: [
              new EmbedBuilder().setColor(0xed4245).setTitle('Access Denied').setDescription('This command is restricted to staff members.')
            ], ephemeral: true });
          }
        }
      }

      // Anti-spam for slash commands
      const antispamConfig = safeJsonParse(guildData.antispam_config, {});
      const slashSpamLimit = antispamConfig.slashSpamLimit || 10;
      const slashSpamWindow = antispamConfig.slashSpamWindow || 5000;
      
      if (guildData.antispam_enabled && !isOwner(interaction.user.id) && !isWhitelisted(interaction.user.id, guildData)) {
        const spamKey = `slash_spam:${interaction.guild.id}:${interaction.user.id}`;
        if (!globalThis._slashSpamTrackers) globalThis._slashSpamTrackers = new Map();
        if (!globalThis._slashSpamTrackers.has(spamKey)) globalThis._slashSpamTrackers.set(spamKey, []);
        
        const timestamps = globalThis._slashSpamTrackers.get(spamKey);
        const now = Date.now();
        timestamps.push(now);
        const recent = timestamps.filter(t => now - t < slashSpamWindow);
        globalThis._slashSpamTrackers.set(spamKey, recent);
        
        if (recent.length >= slashSpamLimit) {
          globalThis._slashSpamTrackers.set(spamKey, []);
          return interaction.reply({ embeds: [
            new EmbedBuilder().setColor(0xed4245).setTitle('Rate Limited').setDescription('You are using slash commands too fast. Please slow down.')
          ], ephemeral: true });
        }
      }

      // Cooldown check
      const { cooldowns } = interaction.client;
      const cmdDataName = command.data?.name || command.name || interaction.commandName;
      
      if (!cooldowns.has(cmdDataName)) {
        cooldowns.set(cmdDataName, new Collection());
      }
      
      const now = Date.now();
      const timestamps = cooldowns.get(cmdDataName);
      const cooldownAmount = (command.cooldown || 3) * 1000;
      
      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
        
        if (now < expirationTime) {
          const expiredTimestamp = Math.round(expirationTime / 1000);
          return interaction.reply({
            content: `Please wait, you are on a cooldown for \`${cmdDataName}\`. You can use it again <t:${expiredTimestamp}:R>.`,
            ephemeral: true
          });
        }
      }
      
      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
      
      try {
        logger.info(`${interaction.user.tag} used /${cmdDataName} in ${interaction.guild.name}`);
        await command.execute(interaction, []);
      } catch (error) {
        logger.error(`Error executing ${cmdDataName}:`, error);
        
        const content = `Error: ${error.message || 'Unknown error'}`;
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content, ephemeral: true }).catch(() => {});
        } else {
          await interaction.reply({ content, ephemeral: true }).catch(() => {});
        }
      }
    }
    
    // Handle buttons
    else if (interaction.isButton()) {
      await handleButton(interaction);
    }
    
    // Handle select menus
    else if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction);
    }
    
    // Handle modals
    else if (interaction.type === InteractionType.ModalSubmit) {
      await handleModal(interaction);
    }
  }
};

async function handleButton(interaction) {
  const { customId } = interaction;
  const db = getDB();

  try {
    if (!interaction.guild) return;

    const guildData = await getGuild(interaction.guild.id);

    // Blacklist check
    const blacklist = safeJsonParse(guildData.blacklist, []);
    if (blacklist.includes(interaction.user.id)) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xed4245).setTitle('Access Denied').setDescription('You are blacklisted from using this bot.')
      ], ephemeral: true });
    }

    // ========== TICKET CREATE BUTTON ==========
    if (customId === 'ticket_create') {
      const tc = safeJsonParse(guildData.ticket_config, {});

      if (!tc.enabled) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('Tickets Disabled')
            .setDescription('The ticket system is currently disabled. Please contact an administrator.')
            .setTimestamp()
        ], ephemeral: true });
      }

      const openCount = await db('tickets')
        .where({ guild_id: interaction.guild.id, user_id: interaction.user.id, status: 'open' })
        .count('id as c').first();

      if (openCount.c >= (tc.max_tickets || 5)) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.warning)
            .setTitle('Ticket Limit Reached')
            .setDescription(`You already have the maximum number of open tickets (${tc.max_tickets || 5}).\nPlease close your existing tickets before opening a new one.`)
            .setTimestamp()
        ], ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const ticketNum = (await db('tickets').where({ guild_id: interaction.guild.id }).count('id as c').first()).c + 1;

      const channel = await interaction.guild.channels.create({
        name: `ticket-${ticketNum}`,
        type: ChannelType.GuildText,
        parent: tc.category || null,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: ['ViewChannel'] },
          { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
          { id: interaction.guild.members.me.roles.highest.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
        ]
      });

      if (tc.support_role) {
        await channel.permissionOverwrites.edit(tc.support_role, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
      }

      let ticketMessage = tc.ticket_template || '**User:** {user}\n**Reason:** {reason}\n**Ticket:** #{ticket}\n**Server:** {server}';
      ticketMessage = ticketMessage
        .replace(/{user}/g, `<@${interaction.user.id}>`)
        .replace(/{reason}/g, 'Created via panel')
        .replace(/{ticket}/g, ticketNum)
        .replace(/{server}/g, interaction.guild.name);

      await db('tickets').insert({
        guild_id: interaction.guild.id,
        user_id: interaction.user.id,
        channel_id: channel.id,
        status: 'open',
        priority: 'normal',
        messages: JSON.stringify([{ user: interaction.user.id, content: 'Ticket created via panel', time: Date.now() }])
      });

      const ticketEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`Ticket #${ticketNum}`)
        .setDescription([
          `Welcome <@${interaction.user.id}>`,
          '',
          'Our support team will be with you shortly.',
          'Please describe your issue in detail below.',
          '',
          '┌─────────────────────────────────────┐',
          '',
          ticketMessage,
          '',
          '└─────────────────────────────────────┘'
        ].join('\n'))
        .addFields(
          { name: '📋 Status', value: '```Open```', inline: true },
          { name: '🏷️ Priority', value: '```Normal```', inline: true },
          { name: '🕐 Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: `${interaction.guild.name} • Ticket Support`, iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      if (tc.support_role) {
        ticketEmbed.addFields({ name: '**Support Team**', value: `<@&${tc.support_role}>`, inline: false });
      }

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_close')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒'),
        new ButtonBuilder()
          .setCustomId('ticket_claim')
          .setLabel('Claim')
          .setStyle(ButtonStyle.Success)
          .setEmoji('👤')
      );

      const userRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_add_user')
          .setLabel('Add User')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('➕'),
        new ButtonBuilder()
          .setCustomId('ticket_remove_user')
          .setLabel('Remove User')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('➖')
      );

      const pingContent = tc.support_role ? `<@&${tc.support_role}> | <@${interaction.user.id}>` : `<@${interaction.user.id}>`;
      await channel.send({ content: pingContent, embeds: [ticketEmbed], components: [closeRow, userRow] });

      if (tc.log_channel) {
        const logCh = interaction.guild.channels.cache.get(tc.log_channel);
        if (logCh) {
          const logEmbed = new EmbedBuilder()
            .setColor(config.embedColors.success)
            .setTitle('Ticket Opened')
            .addFields(
              { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Channel', value: `${channel}`, inline: true },
              { name: 'Ticket', value: `#${ticketNum}`, inline: true }
            )
            .setTimestamp();
          logCh.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }

      return interaction.editReply({ embeds: [
        new EmbedBuilder()
          .setColor(config.embedColors.success)
          .setTitle('Ticket Created')
          .setDescription(`Your ticket has been created: ${channel}`)
          .setFooter({ text: 'Please wait for a staff member to respond.' })
          .setTimestamp()
      ] });
    }

    // ========== TICKET CLOSE BUTTON ==========
    if (customId === 'ticket_close') {
      const ticket = await db('tickets').where({ channel_id: interaction.channel.id, status: 'open' }).first();
      if (!ticket) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('Not a Ticket')
            .setDescription('This channel is not an open ticket.')
        ], ephemeral: true });
      }

      if (ticket.user_id !== interaction.user.id && !interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('No Permission')
            .setDescription('Only the ticket opener or admins can close this ticket.')
        ], ephemeral: true });
      }

      const closeModal = new ModalBuilder()
        .setCustomId('ticket_close_modal')
        .setTitle('Close Ticket')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('close_reason')
              .setLabel('Reason (optional)')
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder('Enter a reason for closing...')
              .setRequired(false)
              .setMaxLength(500)
          )
        );

      return interaction.showModal(closeModal);

      await interaction.deferReply();

      const messages = safeJsonParse(ticket.messages, []);
      messages.push({ user: interaction.user.id, content: '[CLOSED] Ticket closed via button', time: Date.now() });
      await db('tickets').where({ id: ticket.id }).update({ status: 'closed', messages: JSON.stringify(messages) });

      // Remove user's access instead of deleting channel
      try {
        await interaction.channel.permissionOverwrites.edit(ticket.user_id, { ViewChannel: false });
      } catch (e) {}

      const createdTime = ticket.created_at ? new Date(ticket.created_at).getTime() : Date.now();
      const durationMs = Date.now() - createdTime;
      const hours = Math.floor(durationMs / 3600000);
      const minutes = Math.floor((durationMs % 3600000) / 60000);
      const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      const msgCount = messages.length;

      const transcriptPreview = messages.slice(0, 3).map(m => {
        const content = m.content || '';
        return content.length > 120 ? content.substring(0, 120) + '...' : content;
      }).join('\n');

      const closeEmbed = new EmbedBuilder()
        .setColor(config.embedColors.warning)
        .setTitle(`🔒  Ticket #${ticket.id} — CLOSED`)
        .setDescription([
          `Closed by <@${interaction.user.id}>`,
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '',
          transcriptPreview || '*No messages*',
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        ].join('\n'))
        .addFields(
          { name: '📋 Status', value: '`Closed`', inline: true },
          { name: '⏱️ Duration', value: `\`${durationStr}\``, inline: true },
          { name: '💬 Messages', value: `\`${msgCount}\``, inline: true }
        )
        .setFooter({ text: 'User access removed — Staff can still view' })
        .setTimestamp();

      const closeActionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_reopen')
          .setLabel('Reopen')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🔓'),
        new ButtonBuilder()
          .setCustomId('ticket_transcript')
          .setLabel('Transcript')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📜')
      );

      await interaction.editReply({ embeds: [closeEmbed], components: [closeActionRow] });

      const tc = safeJsonParse(guildData.ticket_config, {});
      if (tc.log_channel) {
        const logCh = interaction.guild.channels.cache.get(tc.log_channel);
        if (logCh) {
          const logEmbed = new EmbedBuilder()
            .setColor(config.embedColors.warning)
            .setTitle('Ticket Closed')
            .addFields(
              { name: 'Closed By', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Ticket', value: `#${ticket.id}`, inline: true }
            )
            .setTimestamp();
          logCh.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }
    }

    // ========== TICKET REOPEN BUTTON ==========
    if (customId === 'ticket_reopen') {
      const ticket = await db('tickets').where({ channel_id: interaction.channel.id, status: 'closed' }).first();
      if (!ticket) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('Not a Closed Ticket')
            .setDescription('This channel is not a closed ticket.')
        ], ephemeral: true });
      }

      if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('No Permission')
            .setDescription('Only admins can reopen tickets.')
        ], ephemeral: true });
      }

      const reopenModal = new ModalBuilder()
        .setCustomId('ticket_reopen_modal')
        .setTitle('Reopen Ticket')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('reopen_reason')
              .setLabel('Reason (optional)')
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder('Enter reason for reopening...')
              .setRequired(false)
              .setMaxLength(500)
          )
        );

      return interaction.showModal(reopenModal);
    }

    // ========== TICKET CLAIM BUTTON ==========
    if (customId === 'ticket_claim') {
      const ticket = await db('tickets').where({ channel_id: interaction.channel.id, status: 'open' }).first();
      if (!ticket) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('Not a Ticket')
            .setDescription('This channel is not an open ticket.')
        ], ephemeral: true });
      }

      if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('No Permission')
            .setDescription('Only administrators can claim tickets.')
        ], ephemeral: true });
      }

      if (ticket.claimed_by) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.warning)
            .setTitle('Already Claimed')
            .setDescription(`This ticket is already claimed by <@${ticket.claimed_by}>.`)
        ], ephemeral: true });
      }

      await db('tickets').where({ id: ticket.id }).update({ claimed_by: interaction.user.id });

      const messages = safeJsonParse(ticket.messages, []);
      messages.push({ user: interaction.user.id, content: '[CLAIMED] Ticket claimed by staff', time: Date.now() });
      await db('tickets').where({ id: ticket.id }).update({ messages: JSON.stringify(messages) });

      const claimEmbed = new EmbedBuilder()
        .setColor(config.embedColors.success)
        .setTitle('Ticket Claimed')
        .setDescription(`This ticket has been claimed by <@${interaction.user.id}>.\nThey will be assisting you.`)
        .setTimestamp();

      return interaction.reply({ embeds: [claimEmbed] });
    }

    // ========== TICKET TRANSCRIPT BUTTON ==========
    if (customId === 'ticket_transcript') {
      const ticket = await db('tickets').where({ channel_id: interaction.channel.id }).first();
      if (!ticket) return;

      if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('No Permission')
            .setDescription('Only admins can view transcripts.')
        ], ephemeral: true });
      }

      const msgs = safeJsonParse(ticket.messages, []);
      let transcript = `Ticket #${ticket.id} - ${ticket.status}\nUser: ${ticket.user_id}\nChannel: ${ticket.channel_id}\n\n`;
      for (const m of msgs) {
        transcript += `[${new Date(m.time).toLocaleString()}] <@${m.user}>: ${m.content}\n`;
      }
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`📜 Transcript — Ticket #${ticket.id}`).setDescription(`\`\`\`\n${transcript.substring(0, 1900)}\n\`\`\``).setTimestamp()], ephemeral: true });
    }

    // ========== TICKET ADD USER BUTTON ==========
    if (customId === 'ticket_add_user') {
      const ticket = await db('tickets').where({ channel_id: interaction.channel.id, status: 'open' }).first();
      if (!ticket) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('Not a Ticket')
            .setDescription('This channel is not an open ticket.')
        ], ephemeral: true });
      }

      if (ticket.user_id !== interaction.user.id && !interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('No Permission')
            .setDescription('Only the ticket opener or admins can add users.')
        ], ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId('ticket_add_user_modal')
        .setTitle('Add User to Ticket');

      const userInput = new TextInputBuilder()
        .setCustomId('user_id')
        .setLabel('User ID or Mention')
        .setPlaceholder('Enter a user ID or @mention')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(userInput));
      return interaction.showModal(modal);
    }

    // ========== TICKET REMOVE USER BUTTON ==========
    if (customId === 'ticket_remove_user') {
      const ticket = await db('tickets').where({ channel_id: interaction.channel.id, status: 'open' }).first();
      if (!ticket) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('Not a Ticket')
            .setDescription('This channel is not an open ticket.')
        ], ephemeral: true });
      }

      if (ticket.user_id !== interaction.user.id && !interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('No Permission')
            .setDescription('Only the ticket opener or admins can remove users.')
        ], ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId('ticket_remove_user_modal')
        .setTitle('Remove User from Ticket');

      const userInput = new TextInputBuilder()
        .setCustomId('user_id')
        .setLabel('User ID or Mention')
        .setPlaceholder('Enter a user ID or @mention')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(userInput));
      return interaction.showModal(modal);
    }

    // ========== SECURITY BUTTON HANDLERS ==========
    if (customId.startsWith('security_')) {
      const member = interaction.member;
      if (!member || !member.permissions.has('Administrator')) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('No Permission')
            .setDescription('Only administrators can use security controls.')
        ], ephemeral: true });
      }
    }

  } catch (error) {
    logger.error('Button interaction error:', error);
    const reply = {
      embeds: [new EmbedBuilder().setColor(config.embedColors.error).setTitle('Error').setDescription('An error occurred while processing this action.').setTimestamp()],
      ephemeral: true
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
}

async function handleSelectMenu(interaction) {
  try {
    if (!interaction.guild) return;

    const guildData = await getGuild(interaction.guild.id);
    const blacklist = safeJsonParse(guildData.blacklist, []);
    if (blacklist.includes(interaction.user.id)) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xed4245).setTitle('Access Denied').setDescription('You are blacklisted from using this bot.')
      ], ephemeral: true });
    }

    logger.debug(`Select menu interaction: ${interaction.customId}`);
  } catch (error) {
    logger.error('Select menu interaction error:', error);
  }
}

async function handleModal(interaction) {
  const db = getDB();

  try {
    if (!interaction.guild) return;

    const guildData = await getGuild(interaction.guild.id);
    const blacklist = safeJsonParse(guildData.blacklist, []);
    if (blacklist.includes(interaction.user.id)) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xed4245).setTitle('Access Denied').setDescription('You are blacklisted from using this bot.')
      ], ephemeral: true });
    }

    if (interaction.customId === 'ticket_close_modal') {
      const ticket = await db('tickets').where({ channel_id: interaction.channel.id, status: 'open' }).first();
      if (!ticket) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.embedColors.error).setTitle('Not a Ticket').setDescription('This channel is not an open ticket.')], ephemeral: true });

      const reason = interaction.fields.getTextInputValue('close_reason') || 'No reason';

      const messages = safeJsonParse(ticket.messages, []);
      messages.push({ user: interaction.user.id, content: `[CLOSED] ${reason}`, time: Date.now() });
      await db('tickets').where({ id: ticket.id }).update({ status: 'closed', messages: JSON.stringify(messages) });

      try {
        await interaction.channel.permissionOverwrites.edit(ticket.user_id, { ViewChannel: false });
      } catch (e) {}

      const createdTime = ticket.created_at ? new Date(ticket.created_at).getTime() : Date.now();
      const durationMs = Date.now() - createdTime;
      const hours = Math.floor(durationMs / 3600000);
      const minutes = Math.floor((durationMs % 3600000) / 60000);
      const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      const msgCount = messages.length;

      const transcriptPreview = messages.slice(0, 3).map(m => {
        const content = m.content || '';
        return content.length > 120 ? content.substring(0, 120) + '...' : content;
      }).join('\n');

      const closeEmbed = new EmbedBuilder()
        .setColor(config.embedColors.warning)
        .setTitle(`🔒  Ticket #${ticket.id} — CLOSED`)
        .setDescription([
          `Closed by <@${interaction.user.id}>`,
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '',
          transcriptPreview || '*No messages*',
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        ].join('\n'))
        .addFields(
          { name: '📋 Status', value: '`Closed`', inline: true },
          { name: '⏱️ Duration', value: `\`${durationStr}\``, inline: true },
          { name: '💬 Messages', value: `\`${msgCount}\``, inline: true }
        )
        .setFooter({ text: 'User access removed — Staff can still view' })
        .setTimestamp();

      const closeActionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen').setStyle(ButtonStyle.Success).setEmoji('🔓'),
        new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary).setEmoji('📜')
      );

      await interaction.reply({ embeds: [closeEmbed], components: [closeActionRow] });

      const tc = safeJsonParse(guildData.ticket_config, {});
      if (tc.log_channel) {
        const logCh = interaction.guild.channels.cache.get(tc.log_channel);
        if (logCh) {
          const logEmbed = new EmbedBuilder()
            .setColor(config.embedColors.warning)
            .setTitle('Ticket Closed')
            .addFields(
              { name: 'Closed By', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Reason', value: reason.substring(0, 100), inline: true },
              { name: 'Ticket', value: `#${ticket.id}`, inline: true }
            )
            .setTimestamp();
          logCh.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }
      return;
    }

    if (interaction.customId === 'ticket_reopen_modal') {
      const ticket = await db('tickets').where({ channel_id: interaction.channel.id, status: 'closed' }).first();
      if (!ticket) return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.embedColors.error).setTitle('Not a Closed Ticket').setDescription('This channel is not a closed ticket.')], ephemeral: true });

      if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(config.embedColors.error).setTitle('No Permission').setDescription('Only admins can reopen tickets.')], ephemeral: true });
      }

      const reason = interaction.fields.getTextInputValue('reopen_reason') || 'No reason';

      try {
        await interaction.channel.permissionOverwrites.edit(ticket.user_id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
      } catch (e) {}

      const reopenMsgs = safeJsonParse(ticket.messages, []);
      reopenMsgs.push({ user: interaction.user.id, content: `[REOPENED] ${reason}`, time: Date.now() });
      await db('tickets').where({ id: ticket.id }).update({ status: 'open', claimed_by: null, messages: JSON.stringify(reopenMsgs) });

      const reopenEmbed = new EmbedBuilder()
        .setColor(config.embedColors.success)
        .setTitle(`🔓  Ticket #${ticket.id} — REOPENED`)
        .setDescription([
          `Reopened by <@${interaction.user.id}>`,
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '',
          `> ${reason}`,
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        ].join('\n'))
        .setTimestamp();

      await interaction.reply({ embeds: [reopenEmbed] });

      const tc = safeJsonParse(guildData.ticket_config, {});
      if (tc.log_channel) {
        const logCh = interaction.guild.channels.cache.get(tc.log_channel);
        if (logCh) {
          logCh.send({ embeds: [
            new EmbedBuilder()
              .setColor(config.embedColors.success)
              .setTitle('Ticket Reopened')
              .addFields(
                { name: 'Reopened By', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Reason', value: reason.substring(0, 100), inline: true },
                { name: 'Ticket', value: `#${ticket.id}`, inline: true }
              )
              .setTimestamp()
          ] }).catch(() => {});
        }
      }
      return;
    }

    if (interaction.customId === 'ticket_add_user_modal') {
      const ticket = await db('tickets').where({ channel_id: interaction.channel.id, status: 'open' }).first();
      if (!ticket) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('Not a Ticket')
            .setDescription('This channel is not an open ticket.')
        ], ephemeral: true });
      }

      if (ticket.user_id !== interaction.user.id && !interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('No Permission')
            .setDescription('Only the ticket opener or admins can add users.')
        ], ephemeral: true });
      }

      const rawInput = interaction.fields.getTextInputValue('user_id');
      const userId = rawInput.replace(/[<@!>]/g, '');

      if (!/^\d{17,20}$/.test(userId)) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('Invalid User ID')
            .setDescription('Please enter a valid user ID (17-20 digits).')
        ], ephemeral: true });
      }

      let user;
      try {
        user = await interaction.guild.members.fetch(userId);
      } catch (e) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('Invalid User')
            .setDescription('Could not find that user. Please enter a valid user ID.')
        ], ephemeral: true });
      }

      try {
        await interaction.channel.permissionOverwrites.edit(userId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
      } catch (e) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('Error')
            .setDescription('Could not add user to the ticket.')
        ], ephemeral: true });
      }

      const messages = safeJsonParse(ticket.messages, []);
      messages.push({ user: userId, content: `[ADDED] <@${userId}> added to ticket`, time: Date.now() });
      await db('tickets').where({ id: ticket.id }).update({ messages: JSON.stringify(messages) });

      return interaction.reply({ embeds: [
        new EmbedBuilder()
          .setColor(config.embedColors.success)
          .setTitle('User Added')
          .setDescription(`<@${userId}> has been added to this ticket.`)
          .setTimestamp()
      ] });
    }

    // ========== REMOVE USER MODAL ==========
    if (interaction.customId === 'ticket_remove_user_modal') {
      const ticket = await db('tickets').where({ channel_id: interaction.channel.id, status: 'open' }).first();
      if (!ticket) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('Not a Ticket')
            .setDescription('This channel is not an open ticket.')
        ], ephemeral: true });
      }

      if (ticket.user_id !== interaction.user.id && !interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('No Permission')
            .setDescription('Only the ticket opener or admins can remove users.')
        ], ephemeral: true });
      }

      const rawInput = interaction.fields.getTextInputValue('user_id');
      const userId = rawInput.replace(/[<@!>]/g, '');

      if (!/^\d{17,20}$/.test(userId)) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('Invalid User ID')
            .setDescription('Please enter a valid user ID (17-20 digits).')
        ], ephemeral: true });
      }

      try {
        await interaction.channel.permissionOverwrites.edit(userId, {
          ViewChannel: false,
          SendMessages: false,
          ReadMessageHistory: false
        });
      } catch (e) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle('Error')
            .setDescription('Could not remove user from the ticket.')
        ], ephemeral: true });
      }

      const messages = safeJsonParse(ticket.messages, []);
      messages.push({ user: userId, content: `[REMOVED] <@${userId}> removed from ticket`, time: Date.now() });
      await db('tickets').where({ id: ticket.id }).update({ messages: JSON.stringify(messages) });

      return interaction.reply({ embeds: [
        new EmbedBuilder()
          .setColor(config.embedColors.success)
          .setTitle('User Removed')
          .setDescription(`<@${userId}> has been removed from this ticket.`)
          .setTimestamp()
      ] });
    }

  } catch (error) {
    logger.error('Modal interaction error:', error);
    const reply = {
      embeds: [new EmbedBuilder().setColor(config.embedColors.error).setTitle('Error').setDescription('An error occurred while processing this action.').setTimestamp()],
      ephemeral: true
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
}
