const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed, safeJsonParse } = require('../../utils/helpers');
const { getGuild } = require('../../db/guildRepository');
const { getDB } = require('../../db/connection');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Complete ticket system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable ticket system'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable ticket system'))
    .addSubcommand(sub => sub.setName('setup').setDescription('Quick setup with auto-config'))
    .addSubcommand(sub => sub.setName('panel').setDescription('Send ticket panel')
      .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send panel to')))
    .addSubcommand(sub => sub.setName('config').setDescription('View ticket configuration'))
    .addSubcommand(sub => sub.setName('stats').setDescription('View ticket statistics'))
    .addSubcommand(sub => sub.setName('list').setDescription('List all open tickets'))
    .addSubcommandGroup(group => group.setName('category').setDescription('Set ticket category')
      .addSubcommand(sub => sub.setName('set').setDescription('Set category')
        .addChannelOption(opt => opt.setName('channel').setDescription('Category channel').setRequired(true)))
      .addSubcommand(sub => sub.setName('remove').setDescription('Remove category')))
    .addSubcommandGroup(group => group.setName('log').setDescription('Set ticket log channel')
      .addSubcommand(sub => sub.setName('set').setDescription('Set log channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Log channel').setRequired(true)))
      .addSubcommand(sub => sub.setName('remove').setDescription('Remove log channel')))
    .addSubcommandGroup(group => group.setName('role').setDescription('Set support role')
      .addSubcommand(sub => sub.setName('set').setDescription('Set support role')
        .addRoleOption(opt => opt.setName('role').setDescription('Support role').setRequired(true)))
      .addSubcommand(sub => sub.setName('remove').setDescription('Remove support role')))
    .addSubcommand(sub => sub.setName('limit').setDescription('Set max tickets per user')
      .addIntegerOption(opt => opt.setName('count').setDescription('Max tickets').setRequired(true).setMinValue(1).setMaxValue(20)))
    .addSubcommand(sub => sub.setName('message').setDescription('Set panel message')
      .addStringOption(opt => opt.setName('text').setDescription('Panel message text').setRequired(true)))
    .addSubcommand(sub => sub.setName('unclaim').setDescription('Unclaim a ticket'))
    .addSubcommand(sub => sub.setName('transfer').setDescription('Transfer ticket to another user')
      .addUserOption(opt => opt.setName('user').setDescription('User to transfer to').setRequired(true)))
    .addSubcommand(sub => sub.setName('note').setDescription('Add internal staff note')
      .addStringOption(opt => opt.setName('text').setDescription('Note text').setRequired(true)))
    .addSubcommand(sub => sub.setName('rating').setDescription('Rate ticket experience')
      .addIntegerOption(opt => opt.setName('stars').setDescription('Rating 1-5').setRequired(true).setMinValue(1).setMaxValue(5)))
    .addSubcommand(sub => sub.setName('rename').setDescription('Rename ticket channel')
      .addStringOption(opt => opt.setName('name').setDescription('New name').setRequired(true))),

  cooldown: 5,
  aliases: ['tickets', 'support'],
  prefix: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const user = isSlash ? interaction.user : interaction.author;
    const member = isSlash ? interaction.member : guild.members.cache.get(user.id);
    const reply = (opts) => isSlash ? interaction.reply(opts) : interaction.channel.send(opts);
    const db = getDB();

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator permission.')] });
    }

    try {
      let subcommand, subcommandGroup;
      if (isSlash) {
        subcommandGroup = interaction.options.getSubcommandGroup(false);
        subcommand = interaction.options.getSubcommand();
      } else {
        const raw = (args?.[0] || '').toLowerCase();
        const raw2 = (args?.[1] || '').toLowerCase();
        if (['enable', 'disable', 'setup', 'panel', 'config', 'stats', 'list', 'open', 'close', 'add', 'remove', 'claim', 'unclaim', 'reopen', 'priority', 'transcript', 'delete', 'message', 'limit', 'transfer', 'note', 'rating', 'rename'].includes(raw)) {
          subcommand = raw;
        } else if (raw === 'category' && ['set', 'remove'].includes(raw2)) {
          subcommandGroup = 'category';
          subcommand = raw2;
        } else if (raw === 'log' && ['set', 'remove'].includes(raw2)) {
          subcommandGroup = 'log';
          subcommand = raw2;
        } else if (raw === 'role' && ['set', 'remove'].includes(raw2)) {
          subcommandGroup = 'role';
          subcommand = raw2;
        } else {
          subcommand = 'config';
        }
      }

      const guildData = await getGuild(guild.id);
      let tc = safeJsonParse(guildData.ticket_config, {});

      const saveConfig = async (update) => {
        const merged = { ...tc, ...update };
        await require('../../db/guildRepository').updateGuild(guild.id, { ticket_config: merged });
        tc = merged;
      };

      // ===== ENABLE =====
      if (subcommand === 'enable') {
        await saveConfig({ enabled: true });
        return reply({ embeds: [successEmbed('Tickets Enabled', 'Ticket system is now **enabled**.')] });
      }

      // ===== DISABLE =====
      if (subcommand === 'disable') {
        await saveConfig({ enabled: false });
        return reply({ embeds: [errorEmbed('Tickets Disabled', 'Ticket system is now **disabled**.')] });
      }

      // ===== SETUP =====
      if (subcommand === 'setup') {
        const changes = [];

        let categoryId = tc.category;
        if (!categoryId) {
          const existing = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === 'Tickets');
          if (existing) {
            categoryId = existing.id;
          } else {
            const newCat = await guild.channels.create({ name: 'Tickets', type: ChannelType.GuildCategory });
            categoryId = newCat.id;
            changes.push('Created Tickets category');
          }
        }

        let supportRole = tc.support_role;
        if (!supportRole) {
          const existing = guild.roles.cache.find(r => r.name === 'Support');
          if (existing) {
            supportRole = existing.id;
          } else {
            const newRole = await guild.roles.create({ name: 'Support', color: '#00aaff', permissions: [], reason: 'Auto-created for ticket system' });
            supportRole = newRole.id;
            changes.push('Created Support role');
          }
        }

        let logChannel = tc.log_channel;
        if (!logChannel) {
          const existing = guild.channels.cache.find(c => c.name === 'ticket-logs');
          if (existing) {
            logChannel = existing.id;
          } else {
            const newCh = await guild.channels.create({ name: 'ticket-logs', type: ChannelType.GuildText, permissionOverwrites: [{ id: guild.id, deny: ['SendMessages'] }] });
            logChannel = newCh.id;
            changes.push('Created #ticket-logs channel');
          }
        }

        await saveConfig({
          enabled: true,
          category: categoryId,
          log_channel: logChannel,
          support_role: supportRole,
          max_tickets: 5,
          ticket_message: 'Click the button below to open a ticket.',
          ticket_template: '**User:** {user}\n**Ticket:** #{ticket}\n**Server:** {server}'
        });

        changes.push('Ticket system enabled');

        const openCount = await db('tickets').where({ guild_id: guild.id, status: 'open' }).count('* as c').first();
        const totalCount = await db('tickets').where({ guild_id: guild.id }).count('* as c').first();

        const panelEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`${guild.name} — Support Center`)
          .setDescription([
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '',
            '**Welcome to our support system!**',
            'Our team is ready to assist you with any questions or issues.',
            '',
            `> Click the button below to create a new ticket.`,
            '',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
          ].join('\n'))
          .addFields(
            { name: ' ', value: ' ', inline: false },
            { name: '📋 **How It Works**', value: [
              '▸ Click the **Open Ticket** button below',
              '▸ Describe your issue clearly',
              '▸ Wait for our team to respond',
              '▸ Resolve your issue & close the ticket'
            ].join('\n'), inline: true },
            { name: '📌 **Rules**', value: [
              '▸ One ticket per issue',
              '▸ No spam or duplicate tickets',
              '▸ Be respectful to staff',
              '▸ Do not ping staff directly'
            ].join('\n'), inline: true },
            { name: ' ', value: ' ', inline: false },
            { name: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', value: ' ', inline: false }
          )
          .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
          .setFooter({ text: `${guild.name} • Powered by Support System`, iconURL: guild.iconURL({ dynamic: true }) })
          .setTimestamp();
        if (supportRole) {
          panelEmbed.addFields({ name: '👥 **Support Team**', value: `<@&${supportRole}>`, inline: true });
        }
        panelEmbed.addFields({ name: '📊 **Stats**', value: `Open: ${openCount.c} | Total: ${totalCount.c}`, inline: true });
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_create').setLabel('Open Ticket').setStyle(ButtonStyle.Primary).setEmoji('✉️')
        );
        await interaction.channel.send({ embeds: [panelEmbed], components: [row] });
        changes.push('Panel sent to this channel');

        const embed = successEmbed('Ticket System Ready', changes.map(c => '• ' + c).join('\n'));
        return reply({ embeds: [embed] });
      }

      // ===== PANEL =====
      if (subcommand === 'panel') {
        if (!tc.enabled) return reply({ embeds: [errorEmbed('Not Enabled', 'Run `!ticket setup` first.')] });

        const panelEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`${guild.name} Support Center`)
          .setDescription([
            '**Welcome to our support system!**',
            '',
            tc.ticket_message || 'Need help? Our dedicated support team is ready',
            'to assist you with any questions or issues.',
            '',
            `> Click the button below to create a new ticket.`,
            '',
            '┌─────────────────────────────────────┐'
          ].join('\n'))
          .addFields(
            { name: ' ', value: ' ', inline: false },
            { name: '📋 **How It Works**', value: [
              '▸ Click the **Open Ticket** button below',
              '▸ Describe your issue clearly',
              '▸ Wait for our team to respond',
              '▸ Resolve your issue & close the ticket'
            ].join('\n'), inline: true },
            { name: '📌 **Rules**', value: [
              '▸ One ticket per issue',
              '▸ No spam or duplicate tickets',
              '▸ Be respectful to staff',
              '▸ Do not ping staff directly'
            ].join('\n'), inline: true },
            { name: ' ', value: ' ', inline: false },
            { name: '└─────────────────────────────────────┘', value: ' ', inline: false }
          )
          .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
          .setFooter({ text: `${guild.name} • Powered by Support System`, iconURL: guild.iconURL({ dynamic: true }) })
          .setTimestamp();

        if (tc.support_role) {
          panelEmbed.addFields({ name: '**Our Support Team**', value: `<@&${tc.support_role}>`, inline: false });
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_create').setLabel('Open Ticket').setStyle(ButtonStyle.Primary).setEmoji('✉️')
        );

        const targetChannel = isSlash ? interaction.options.getChannel('channel') || interaction.channel : interaction.channel;
        await targetChannel.send({ embeds: [panelEmbed], components: [row] });
        return reply({ embeds: [successEmbed('Panel Sent', `Panel sent to ${targetChannel}.`)] });
      }

      // ===== CONFIG =====
      if (subcommand === 'config') {
        const embed = infoEmbed('Ticket Configuration', `Settings for **${guild.name}**`);
        embed.addFields(
          { name: 'Status', value: tc.enabled ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Category', value: tc.category ? `<#${tc.category}>` : 'Not set', inline: true },
          { name: 'Log Channel', value: tc.log_channel ? `<#${tc.log_channel}>` : 'Not set', inline: true },
          { name: 'Support Role', value: tc.support_role ? `<@&${tc.support_role}>` : 'Not set', inline: true },
          { name: 'Max Tickets', value: `${tc.max_tickets || 5}`, inline: true },
          { name: 'Panel Message', value: (tc.ticket_message || 'Default').substring(0, 100), inline: false }
        );
        return reply({ embeds: [embed] });
      }

      // ===== STATS =====
      if (subcommand === 'stats') {
        const total = await db('tickets').where({ guild_id: guild.id }).count('id as c').first();
        const open = await db('tickets').where({ guild_id: guild.id, status: 'open' }).count('id as c').first();
        const closed = await db('tickets').where({ guild_id: guild.id, status: 'closed' }).count('id as c').first();
        const embed = infoEmbed('Ticket Statistics', `Stats for **${guild.name}**`);
        embed.addFields(
          { name: 'Total Tickets', value: `${total.c}`, inline: true },
          { name: 'Open', value: `${open.c}`, inline: true },
          { name: 'Closed', value: `${closed.c}`, inline: true }
        );
        return reply({ embeds: [embed] });
      }

      // ===== LIST =====
      if (subcommand === 'list') {
        const openTickets = await db('tickets').where({ guild_id: guild.id, status: 'open' });
        if (openTickets.length === 0) return reply({ embeds: [infoEmbed('Open Tickets', 'No open tickets.')] });
        const list = openTickets.map(t => `<#${t.channel_id}> — <@${t.user_id}> (${t.priority})`).join('\n');
        return reply({ embeds: [infoEmbed(`Open Tickets (${openTickets.length})`, list)] });
      }

      // ===== CATEGORY SET =====
      if (subcommandGroup === 'category' && subcommand === 'set') {
        const cat = isSlash ? interaction.options.getChannel('channel') : (guild.channels.cache.get(args?.[2]?.replace(/[<#>]/g, '')) || guild.channels.cache.find(c => c.name === args?.slice(2).join(' ')));
        if (!cat || cat.type !== ChannelType.GuildCategory) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid category channel.')] });
        await saveConfig({ category: cat.id });
        return reply({ embeds: [successEmbed('Category Set', `Ticket category set to ${cat}.`)] });
      }

      // ===== CATEGORY REMOVE =====
      if (subcommandGroup === 'category' && subcommand === 'remove') {
        await saveConfig({ category: null });
        return reply({ embeds: [successEmbed('Category Removed', 'Ticket category cleared.')] });
      }

      // ===== LOG SET =====
      if (subcommandGroup === 'log' && subcommand === 'set') {
        const ch = isSlash ? interaction.options.getChannel('channel') : (guild.channels.cache.get(args?.[2]?.replace(/[<#>]/g, '')) || interaction.channel);
        await saveConfig({ log_channel: ch.id });
        return reply({ embeds: [successEmbed('Log Channel Set', `Ticket logs will be sent to ${ch}.`)] });
      }

      // ===== LOG REMOVE =====
      if (subcommandGroup === 'log' && subcommand === 'remove') {
        await saveConfig({ log_channel: null });
        return reply({ embeds: [successEmbed('Log Channel Removed', 'Ticket log channel cleared.')] });
      }

      // ===== ROLE SET =====
      if (subcommandGroup === 'role' && subcommand === 'set') {
        const role = isSlash ? interaction.options.getRole('role') : guild.roles.cache.get(args?.[2]?.replace(/[<@&>]/g, ''));
        if (!role) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid role.')] });
        await saveConfig({ support_role: role.id });
        return reply({ embeds: [successEmbed('Support Role Set', `Support role set to ${role}.`)] });
      }

      // ===== ROLE REMOVE =====
      if (subcommandGroup === 'role' && subcommand === 'remove') {
        await saveConfig({ support_role: null });
        return reply({ embeds: [successEmbed('Support Role Removed', 'Support role cleared.')] });
      }

      // ===== LIMIT =====
      if (subcommand === 'limit') {
        const count = isSlash ? interaction.options.getInteger('count') : parseInt(args?.[1]);
        if (!count || isNaN(count) || count < 1 || count > 20) return reply({ embeds: [errorEmbed('Error', 'Provide a number between 1-20.')] });
        await saveConfig({ max_tickets: count });
        return reply({ embeds: [successEmbed('Limit Set', `Max tickets per user set to **${count}**.`)] });
      }

      // ===== MESSAGE =====
      if (subcommand === 'message') {
        const text = isSlash ? interaction.options.getString('text') : args?.slice(1).join(' ');
        if (!text) return reply({ embeds: [errorEmbed('Error', 'Please provide a message.')] });
        await saveConfig({ ticket_message: text });
        return reply({ embeds: [successEmbed('Message Set', 'Panel message updated.')] });
      }

      // ===== OPEN =====
      if (subcommand === 'open') {
        if (!tc.enabled) return reply({ embeds: [errorEmbed('Not Enabled', 'Ticket system is not enabled.')] });
        const reason = isSlash ? '' : args?.slice(1).join(' ') || 'No reason provided';

        const openCount = await db('tickets').where({ guild_id: guild.id, user_id: user.id, status: 'open' }).count('id as c').first();
        if (openCount.c >= (tc.max_tickets || 5)) return reply({ embeds: [errorEmbed('Limit Reached', `You have ${openCount.c} open tickets. Close some first.`)] });

        const ticketNum = (await db('tickets').where({ guild_id: guild.id }).count('id as c').first()).c + 1;
        const channel = await guild.channels.create({
          name: `ticket-${ticketNum}`,
          type: ChannelType.GuildText,
          parent: tc.category || null,
          permissionOverwrites: [
            { id: guild.id, deny: ['ViewChannel'] },
            { id: user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
            { id: guild.members.me.roles.highest.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
          ]
        });

        if (tc.support_role) {
          await channel.permissionOverwrites.edit(tc.support_role, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
        }

        let ticketMessage = (tc.ticket_template || '**User:** {user}\n**Reason:** {reason}\n**Ticket:** #{ticket}').replace(/{user}/g, `<@${user.id}>`).replace(/{reason}/g, reason).replace(/{ticket}/g, ticketNum).replace(/{server}/g, guild.name);

        await db('tickets').insert({
          guild_id: guild.id, user_id: user.id, channel_id: channel.id, status: 'open', priority: 'normal',
          messages: JSON.stringify([{ user: user.id, content: reason, time: Date.now() }])
        });

        const ticketEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`🎫  Ticket #${ticketNum}`)
          .setDescription([
            `Welcome <@${user.id}>`,
            '',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '',
            ticketMessage,
            '',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
          ].join('\n'))
          .addFields(
            { name: '📋 Status', value: '`Open`', inline: true },
            { name: '🏷️ Priority', value: '`Normal`', inline: true },
            { name: '🕐 Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
          )
          .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }))
          .setFooter({ text: `${guild.name} • Ticket Support`, iconURL: guild.iconURL() })
          .setTimestamp();
        if (tc.support_role) ticketEmbed.addFields({ name: '👥 **Support Team**', value: `<@&${tc.support_role}>`, inline: false });

        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
          new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('👤'),
          new ButtonBuilder().setCustomId('ticket_add_user').setLabel('Add User').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
          new ButtonBuilder().setCustomId('ticket_remove_user').setLabel('Remove User').setStyle(ButtonStyle.Secondary).setEmoji('➖')
        );

        const ping = tc.support_role ? `<@&${tc.support_role}> | <@${user.id}>` : `<@${user.id}>`;
        await channel.send({ content: ping, embeds: [ticketEmbed], components: [closeRow] });

        if (tc.log_channel) {
          const logCh = guild.channels.cache.get(tc.log_channel);
          if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor(config.embedColors.success).setTitle('Ticket Opened').addFields({ name: 'User', value: `<@${user.id}>`, inline: true }, { name: 'Channel', value: `${channel}`, inline: true }, { name: 'Ticket', value: `#${ticketNum}`, inline: true }).setTimestamp()] }).catch(() => {});
        }

        return reply({ embeds: [successEmbed('Ticket Created', `Your ticket has been created: ${channel}`)] });
      }

      // ===== CLOSE =====
      if (subcommand === 'close') {
        const ticket = await db('tickets').where({ channel_id: interaction.channel.id, status: 'open' }).first();
        if (!ticket) return reply({ embeds: [errorEmbed('Not a Ticket', 'This channel is not an open ticket.')] });
        if (ticket.user_id !== user.id && !member.permissions.has('Administrator')) return reply({ embeds: [errorEmbed('Permission Denied', 'Only the ticket owner or an admin can close this.')] });

        const reason = isSlash ? '' : args?.slice(1).join(' ') || 'No reason';
        const closeMsgs = safeJsonParse(ticket.messages, []);
        closeMsgs.push({ user: user.id, content: `[CLOSED] ${reason}`, time: Date.now() });
        await db('tickets').where({ id: ticket.id }).update({ status: 'closed', messages: JSON.stringify(closeMsgs) });

        try { await interaction.channel.permissionOverwrites.edit(ticket.user_id, { ViewChannel: false }); } catch (e) {}

        const closeEmbed = new EmbedBuilder().setColor(config.embedColors.warning).setTitle('Ticket Closed').setDescription(`Closed by <@${user.id}>\nUser's access removed. Staff can still view.`).addFields({ name: 'Reason', value: reason }).setTimestamp();
        await interaction.channel.send({ embeds: [closeEmbed] });

        if (tc.log_channel) {
          const logCh = guild.channels.cache.get(tc.log_channel);
          if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor(config.embedColors.warning).setTitle('Ticket Closed').addFields({ name: 'User', value: `<@${ticket.user_id}>`, inline: true }, { name: 'Closed By', value: `<@${user.id}>`, inline: true }, { name: 'Channel', value: `${interaction.channel}`, inline: true }).setTimestamp()] }).catch(() => {});
        }

        if (isSlash) await interaction.reply({ content: 'Ticket closed, user access removed.', ephemeral: true }).catch(() => {});
        return;
      }

      // ===== ADD =====
      if (subcommand === 'add') {
        const ticket = await db('tickets').where({ channel_id: interaction.channel.id }).whereNot({ status: 'archived' }).first();
        if (!ticket) return reply({ embeds: [errorEmbed('Not a Ticket', 'This channel is not a ticket.')] });

        const targetUser = isSlash ? interaction.options.getMember('user') : guild.members.cache.get(args?.[1]?.replace(/[<@!>]/g, ''));
        if (!targetUser) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid user.')] });

        if (isSlash) await interaction.deferReply({ ephemeral: true }).catch(() => {});
        await interaction.channel.permissionOverwrites.edit(targetUser.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
        const addMsgs = safeJsonParse(ticket.messages, []);
        addMsgs.push({ user: user.id, content: `[ADD] Added <@${targetUser.id}>`, time: Date.now() });
        await db('tickets').where({ id: ticket.id }).update({ messages: JSON.stringify(addMsgs) });
        await interaction.channel.send({ content: `👤 ${targetUser} has been added to this ticket by <@${user.id}>.` });
        if (isSlash) await interaction.editReply({ content: `✅ Added ${targetUser} to ticket.` }).catch(() => {});
        return;
      }

      // ===== REMOVE =====
      if (subcommand === 'remove') {
        const ticket = await db('tickets').where({ channel_id: interaction.channel.id }).whereNot({ status: 'archived' }).first();
        if (!ticket) return reply({ embeds: [errorEmbed('Not a Ticket', 'This channel is not a ticket.')] });

        const targetUser = isSlash ? interaction.options.getUser('user') : guild.members.cache.get(args?.[1]?.replace(/[<@!>]/g, ''));
        if (!targetUser) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid user.')] });

        if (isSlash) await interaction.deferReply({ ephemeral: true }).catch(() => {});
        await interaction.channel.permissionOverwrites.edit(targetUser.id, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
        const rmMsgs = safeJsonParse(ticket.messages, []);
        rmMsgs.push({ user: user.id, content: `[REMOVE] Removed <@${targetUser.id || targetUser}>`, time: Date.now() });
        await db('tickets').where({ id: ticket.id }).update({ messages: JSON.stringify(rmMsgs) });
        await interaction.channel.send({ content: `🚫 ${targetUser} has been removed from this ticket by <@${user.id}>.` });
        if (isSlash) await interaction.editReply({ content: `✅ Removed ${targetUser} from ticket.` }).catch(() => {});
        return;
      }

      // ===== CLAIM =====
      if (subcommand === 'claim') {
        const ticket = await db('tickets').where({ channel_id: interaction.channel.id, status: 'open' }).first();
        if (!ticket) return reply({ embeds: [errorEmbed('Not a Ticket', 'This channel is not an open ticket.')] });
        if (ticket.claimed_by) return reply({ embeds: [errorEmbed('Already Claimed', `This ticket is already claimed by <@${ticket.claimed_by}>.`)] });

        if (isSlash) await interaction.deferReply({ ephemeral: true }).catch(() => {});
        await db('tickets').where({ id: ticket.id }).update({ claimed_by: user.id });
        await interaction.channel.send({ embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('🎫 Ticket Claimed')
            .setDescription(`<@${user.id}> has claimed this ticket.\nI will be assisting with this request.`)
            .setFooter({ text: `Ticket #${ticket.id} • ${guild.name}`, iconURL: guild.iconURL() })
            .setTimestamp()
        ]});
        if (isSlash) await interaction.editReply({ content: '✅ Ticket claimed.' }).catch(() => {});
        return;
      }

      // ===== UNCLAIM =====
      if (subcommand === 'unclaim') {
        const ticket = await db('tickets').where({ channel_id: interaction.channel.id, status: 'open' }).first();
        if (!ticket) return reply({ embeds: [errorEmbed('Not a Ticket', 'This channel is not an open ticket.')] });
        if (!ticket.claimed_by) return reply({ embeds: [errorEmbed('Not Claimed', 'This ticket is not claimed by anyone.')] });
        if (ticket.claimed_by !== user.id && !member.permissions.has('Administrator')) return reply({ embeds: [errorEmbed('Permission Denied', 'Only the person who claimed this ticket or an admin can unclaim.')] });

        if (isSlash) await interaction.deferReply({ ephemeral: true }).catch(() => {});
        const claimedBy = ticket.claimed_by;
        await db('tickets').where({ id: ticket.id }).update({ claimed_by: null });
        await interaction.channel.send({ embeds: [
          new EmbedBuilder()
            .setColor(0xfee75c)
            .setTitle('🎫 Ticket Unclaimed')
            .setDescription(`<@${claimedBy}> has unclaimed this ticket.\nThe ticket is now available for other staff.`)
            .setFooter({ text: `Ticket #${ticket.id} • ${guild.name}`, iconURL: guild.iconURL() })
            .setTimestamp()
        ]});
        if (isSlash) await interaction.editReply({ content: '✅ Ticket unclaimed.' }).catch(() => {});
        return;
      }

      // ===== REOPEN =====
      if (subcommand === 'reopen') {
        const ticket = await db('tickets').where({ channel_id: interaction.channel.id, status: 'closed' }).first();
        if (!ticket) return reply({ embeds: [errorEmbed('Not a Closed Ticket', 'This channel is not a closed ticket.')] });

        if (isSlash) await interaction.deferReply({ ephemeral: true }).catch(() => {});
        await db('tickets').where({ id: ticket.id }).update({ status: 'open', claimed_by: null });
        await interaction.channel.send({ content: `🔓 Ticket reopened by <@${user.id}>.` });
        if (isSlash) await interaction.editReply({ content: '✅ Ticket reopened.' }).catch(() => {});
        return;
      }

      // ===== PRIORITY =====
      if (subcommand === 'priority') {
        const level = isSlash ? interaction.options.getString('level') : (args?.[1] || 'normal').toLowerCase();
        if (!['low', 'normal', 'high', 'urgent'].includes(level)) return reply({ embeds: [errorEmbed('Error', 'Valid priorities: low, normal, high, urgent')] });

        const ticket = await db('tickets').where({ channel_id: interaction.channel.id }).whereNot({ status: 'archived' }).first();
        if (!ticket) return reply({ embeds: [errorEmbed('Not a Ticket', 'This channel is not a ticket.')] });

        if (isSlash) await interaction.deferReply({ ephemeral: true }).catch(() => {});
        await db('tickets').where({ id: ticket.id }).update({ priority: level });
        await interaction.channel.send({ content: `Priority set to **${level}** by <@${user.id}>.` });
        if (isSlash) await interaction.editReply({ content: `✅ Priority set to ${level}.` }).catch(() => {});
        return;
      }

      // ===== TRANSFER =====
      if (subcommand === 'transfer') {
        const ticket = await db('tickets').where({ channel_id: interaction.channel.id }).first();
        if (!ticket) return reply({ embeds: [errorEmbed('Not a Ticket', 'This channel is not a ticket.')] });
        if (ticket.user_id !== user.id && !member.permissions.has('Administrator')) return reply({ embeds: [errorEmbed('Permission Denied', 'Only the ticket owner or an admin can transfer this.')] });

        const target = isSlash ? interaction.options.getUser('user') : message.mentions.users.first();
        if (!target) return reply({ embeds: [errorEmbed('Missing User', 'Mention a user to transfer to.')] });
        const targetMember = await guild.members.fetch(target.id).catch(() => null);
        if (!targetMember) return reply({ embeds: [errorEmbed('Invalid User', 'That user is not in this server.')] });

        const oldUser = ticket.user_id;
        try {
          await interaction.channel.permissionOverwrites.edit(oldUser, { ViewChannel: false, SendMessages: false });
          await interaction.channel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
        } catch (e) {}

        const transferMsgs = safeJsonParse(ticket.messages, []);
        transferMsgs.push({ user: user.id, content: `[TRANSFER] Ticket transferred from <@${oldUser}> to <@${target.id}>`, time: Date.now() });
        await db('tickets').where({ id: ticket.id }).update({ user_id: target.id, messages: JSON.stringify(transferMsgs) });

        await interaction.channel.send({ content: `🔄 Ticket transferred from <@${oldUser}> to <@${target.id}> by <@${user.id}>.` });
        if (isSlash) await interaction.editReply({ content: `✅ Ticket transferred to ${target}.` }).catch(() => {});
        return;
      }

      // ===== NOTE =====
      if (subcommand === 'note') {
        const ticket = await db('tickets').where({ channel_id: interaction.channel.id }).first();
        if (!ticket) return reply({ embeds: [errorEmbed('Not a Ticket', 'This channel is not a ticket.')] });
        if (!member.permissions.has('Administrator') && !(tc.support_role && member.roles.cache.has(tc.support_role))) {
          return reply({ embeds: [errorEmbed('Permission Denied', 'Only staff can add notes.')] });
        }

        const text = isSlash ? interaction.options.getString('text') : args?.slice(1).join(' ');
        if (!text) return reply({ embeds: [errorEmbed('Missing Text', 'Provide a note to add.')] });

        const noteMsgs = safeJsonParse(ticket.messages, []);
        noteMsgs.push({ user: user.id, content: `[NOTE] ${text}`, time: Date.now(), internal: true });
        await db('tickets').where({ id: ticket.id }).update({ messages: JSON.stringify(noteMsgs) });

        await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(0xfee75c).setTitle('📝 Note Added').setDescription(`<@${user.id}> added an internal note:\n\n> ${text.substring(0, 1500)}`).setTimestamp()] });
        if (isSlash) await interaction.editReply({ content: '✅ Note added.' }).catch(() => {});
        return;
      }

      // ===== RATING =====
      if (subcommand === 'rating') {
        const ticket = await db('tickets').where({ channel_id: interaction.channel.id }).first();
        if (!ticket) return reply({ embeds: [errorEmbed('Not a Ticket', 'This channel is not a ticket.')] });
        if (ticket.status !== 'closed') return reply({ embeds: [errorEmbed('Not Closed', 'Rate a ticket after it is closed.')] });
        if (ticket.user_id !== user.id) return reply({ embeds: [errorEmbed('Permission Denied', 'Only the ticket owner can rate.')] });

        const stars = isSlash ? interaction.options.getInteger('stars') : parseInt(args?.[1]);
        if (!stars || stars < 1 || stars > 5) return reply({ embeds: [errorEmbed('Invalid Rating', 'Provide a number 1-5.')] });

        await db('tickets').where({ id: ticket.id }).update({ rating: stars });
        const starsStr = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
        await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(0xfee75c).setTitle('⭐ Rating Submitted').setDescription(`<@${user.id}> rated this ticket:\n\n${starsStr}`).setTimestamp()] });
        if (isSlash) await interaction.editReply({ content: `✅ Rated ${stars}/5.` }).catch(() => {});
        return;
      }

      // ===== RENAME =====
      if (subcommand === 'rename') {
        const ticket = await db('tickets').where({ channel_id: interaction.channel.id }).first();
        if (!ticket) return reply({ embeds: [errorEmbed('Not a Ticket', 'This channel is not a ticket.')] });
        if (ticket.user_id !== user.id && !member.permissions.has('Administrator')) return reply({ embeds: [errorEmbed('Permission Denied', 'Only the ticket owner or an admin can rename.')] });

        const name = isSlash ? interaction.options.getString('name') : args?.slice(1).join(' ');
        if (!name) return reply({ embeds: [errorEmbed('Missing Name', 'Provide a new channel name.')] });
        const cleanName = name.replace(/[^a-z0-9\-_]/gi, '-').substring(0, 100);

        await interaction.channel.setName(cleanName);
        await db('tickets').where({ id: ticket.id }).update({ channel_name: cleanName });
        await interaction.channel.send({ content: `📝 Ticket renamed to **${cleanName}** by <@${user.id}>.` });
        if (isSlash) await interaction.editReply({ content: `✅ Renamed to ${cleanName}.` }).catch(() => {});
        return;
      }

      // ===== TRANSCRIPT =====
      if (subcommand === 'transcript') {
        const ticket = await db('tickets').where({ channel_id: interaction.channel.id }).first();
        if (!ticket) return reply({ embeds: [errorEmbed('Not a Ticket', 'This channel is not a ticket.')] });

        if (isSlash) await interaction.deferReply({ ephemeral: true }).catch(() => {});
        const msgs = safeJsonParse(ticket.messages, []);
        let transcript = `Ticket #${ticket.id} - ${ticket.status}\nUser: ${ticket.user_id}\nChannel: ${ticket.channel_id}\n\n`;
        for (const m of msgs) {
          transcript += `[${new Date(m.time).toLocaleString()}] <@${m.user}>: ${m.content}\n`;
        }
        if (isSlash) {
          await interaction.editReply({ embeds: [infoEmbed('Transcript', `\`\`\`\n${transcript.substring(0, 1900)}\n\`\`\``)] }).catch(() => {});
        } else {
          await interaction.channel.send({ embeds: [infoEmbed('Transcript', `\`\`\`\n${transcript.substring(0, 1900)}\n\`\`\``)] });
        }
        return;
      }

      // ===== DELETE =====
      if (subcommand === 'delete') {
        const ticket = await db('tickets').where({ channel_id: interaction.channel.id }).first();
        if (!ticket) return reply({ embeds: [errorEmbed('Not a Ticket', 'This channel is not a ticket.')] });
        if (ticket.user_id !== user.id && !member.permissions.has('Administrator')) return reply({ embeds: [errorEmbed('Permission Denied', 'Only the ticket owner or an admin can delete this.')] });

        await db('tickets').where({ id: ticket.id }).update({ status: 'archived' });
        if (isSlash) await interaction.reply({ content: 'Deleting ticket...', ephemeral: true }).catch(() => {});
        await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(0xff0000).setTitle('Ticket Deleted').setDescription(`Ticket deleted by <@${user.id}>. Channel will be removed in 5 seconds.`).setTimestamp()] });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        return;
      }

    } catch (error) {
      console.error(error);
      reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] }).catch(() => {});
    }
  }
};