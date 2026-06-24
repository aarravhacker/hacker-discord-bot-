const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config');
const { getDB } = require('../../db/connection');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Open the server dashboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['db', 'panel'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    if (!guild) return interaction.reply({ embeds: [
      new EmbedBuilder().setColor(0xff0000).setTitle('Error').setDescription('This command can only be used in a server.')
    ] });

    const member = guild.members.cache.get(user.id);
    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xff0000).setTitle('No Permission').setDescription('You need Administrator permission to use the dashboard.')
      ], ephemeral: true });
    }

    const db = getDB();
    const guildConfig = await getGuild(guild.id);
    const tc = guildConfig.ticket_config || {};

    const totalMembers = guild.memberCount;
    const botCount = guild.members.cache.filter(m => m.user.bot).size;
    const humanCount = totalMembers - botCount;
    const onlineCount = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
    const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
    const categories = guild.channels.cache.filter(c => c.type === 4).size;
    const roles = guild.roles.cache.size;
    const emojis = guild.emojis.cache.size;
    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount || 0;

    const openTickets = await db('tickets').where({ guild_id: guild.id, status: 'open' }).count('id as c').first();

    const healthScore = Math.min(100, Math.round(
      (onlineCount / Math.max(humanCount, 1) * 30) +
      (textChannels > 5 ? 20 : textChannels * 4) +
      (roles > 5 ? 15 : roles * 3) +
      (openTickets.c < 10 ? 20 : 10) +
      (boostCount > 0 ? 15 : 0)
    ));

    const mainEmbed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle(`${guild.name} - Dashboard`)
      .setDescription(`**Server Control Center**\nSelect a panel from the menu below to manage your server.`)
      .addFields(
        { name: 'Members', value: `Total: \`${totalMembers}\`\nHumans: \`${humanCount}\`\nBots: \`${botCount}\`\nOnline: \`${onlineCount}\``, inline: true },
        { name: 'Channels', value: `Text: \`${textChannels}\`\nVoice: \`${voiceChannels}\`\nCategories: \`${categories}\``, inline: true },
        { name: 'Server', value: `Roles: \`${roles}\`\nEmojis: \`${emojis}\`\nBoost: \`${boostCount}\` (Tier ${boostLevel})`, inline: true },
        { name: 'Tickets', value: `Open: \`${openTickets.c}\``, inline: true },
        { name: 'Health', value: getHealthBar(healthScore), inline: true },
        { name: 'Bot', value: `Commands: \`${interaction.client.commands.size}\`\nGuilds: \`${interaction.client.guilds.cache.size}\``, inline: true }
      )
      .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
      .setFooter({ text: `${guild.name} Dashboard` })
      .setTimestamp();

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('dash_select')
        .setPlaceholder('Select a panel...')
        .addOptions([
          { label: 'Overview', description: 'Server overview and stats', value: 'overview', emoji: '📊' },
          { label: 'Channels', description: 'View and manage channels', value: 'channels', emoji: '📢' },
          { label: 'Members', description: 'View and manage members', value: 'members', emoji: '👥' },
          { label: 'Roles', description: 'View and manage roles', value: 'roles', emoji: '🏷️' },
          { label: 'Settings', description: 'Server configuration', value: 'settings', emoji: '⚙️' },
          { label: 'Tickets', description: 'Ticket system panel', value: 'tickets', emoji: '🎫' },
          { label: 'Quick Actions', description: 'Common admin actions', value: 'actions', emoji: '⚡' }
        ])
    );

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('dash_refresh').setLabel('Refresh').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dash_lockdown').setLabel('Lockdown').setEmoji('🔒').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('dash_slowmode').setLabel('Slowmode').setEmoji('⏱️').setStyle(ButtonStyle.Primary)
    );

    const response = await interaction.reply({ embeds: [mainEmbed], components: [selectRow, buttonRow], fetchReply: true });

    const filter = (i) => i.user.id === user.id;
    const collector = response.createMessageComponentCollector({ filter, time: 300000 });

    collector.on('collect', async (i) => {
      try {
        if (i.customId === 'dash_refresh') {
          const newEmbed = await buildOverview(guild, interaction.client, db, tc);
          await i.update({ embeds: [newEmbed], components: [selectRow, buttonRow] });
          return;
        }

        if (i.customId === 'dash_lockdown') {
          const everyone = guild.roles.everyone;
          const currentPerms = everyone.permissions;
          const isLocked = !currentPerms.has('SendMessages');

          await everyone.setPermissions(
            isLocked
              ? currentPerms.add('SendMessages')
              : currentPerms.remove('SendMessages'),
            `${isLocked ? 'Unlocked' : 'Locked'} by ${user.tag} via Dashboard`
          );

          const lockEmbed = new EmbedBuilder()
            .setColor(isLocked ? 0x00ff00 : 0xff0000)
            .setTitle(isLocked ? 'Server Unlocked' : 'Server Locked')
            .setDescription(isLocked
              ? 'Members can now send messages.'
              : 'Members can no longer send messages.')
            .setTimestamp();

          await i.reply({ embeds: [lockEmbed], ephemeral: true });
          return;
        }

        if (i.customId === 'dash_slowmode') {
          const channel = guild.channels.cache.get(i.channel.id);
          const current = channel.rateLimitPerUser || 0;
          const next = current === 0 ? 5 : current >= 30 ? 0 : current + 5;

          await channel.setRateLimitPerUser(next, `Slowmode set by ${user.tag} via Dashboard`);

          const slowEmbed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('Slowmode Updated')
            .setDescription(`Slowmode set to \`${next}s\``)
            .setTimestamp();

          await i.reply({ embeds: [slowEmbed], ephemeral: true });
          return;
        }

        if (i.customId === 'dash_select') {
          const panel = i.values[0];

          if (panel === 'overview') {
            const embed = await buildOverview(guild, interaction.client, db, tc);
            await i.update({ embeds: [embed], components: [selectRow, buttonRow] });
            return;
          }

          if (panel === 'channels') {
            const embed = await buildChannels(guild);
            const channelSelect = new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('dash_ch_action')
                .setPlaceholder('Select channel action...')
                .addOptions([
                  { label: 'Lock Channel', description: 'Lock a text channel', value: 'lock', emoji: '🔒' },
                  { label: 'Unlock Channel', description: 'Unlock a text channel', value: 'unlock', emoji: '🔓' },
                  { label: 'Slowmode', description: 'Set slowmode on a channel', value: 'slowmode', emoji: '⏱️' },
                  { label: 'Clear Messages', description: 'Purge messages from a channel', value: 'purge', emoji: '🗑️' },
                  { label: 'NSFW Toggle', description: 'Toggle NSFW on a channel', value: 'nsfw', emoji: '🔞' },
                  { label: 'Channel Info', description: 'Get channel details', value: 'info', emoji: 'ℹ️' }
                ])
            );
            await i.update({ embeds: [embed], components: [channelSelect, buttonRow] });
            return;
          }

          if (panel === 'members') {
            const embed = await buildMembers(guild);
            await i.update({ embeds: [embed], components: [selectRow, buttonRow] });
            return;
          }

          if (panel === 'roles') {
            const embed = await buildRoles(guild);
            await i.update({ embeds: [embed], components: [selectRow, buttonRow] });
            return;
          }

          if (panel === 'settings') {
            const embed = await buildSettings(guild, guildConfig);
            await i.update({ embeds: [embed], components: [selectRow, buttonRow] });
            return;
          }

          if (panel === 'tickets') {
            const embed = await buildTickets(db, guild.id);
            await i.update({ embeds: [embed], components: [selectRow, buttonRow] });
            return;
          }

          if (panel === 'actions') {
            const embed = new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle('Quick Actions')
              .setDescription('Use these commands for quick actions:')
              .addFields(
                { name: 'Moderation', value: '`!ban`, `!kick`, `!mute`, `!warn`, `!purge`', inline: false },
                { name: 'Channels', value: '`!lock`, `!unlock`, `!slowmode`, `!createchannel`', inline: false },
                { name: 'Roles', value: '`!createrole`, `!rolecolor`, `!roleinfo`', inline: false },
                { name: 'Tickets', value: '`!ticket panel`, `!ticket list`, `!ticket stats`', inline: false },
                { name: 'Security', value: '`!antinuke`, `!antiraid`, `!lockdown`', inline: false },
                { name: 'Admin', value: '`!config`, `!setwelcome`, `!setlog`', inline: false }
              )
              .setTimestamp();
            await i.update({ embeds: [embed], components: [selectRow, buttonRow] });
            return;
          }
        }
      } catch (err) {
        console.error('Dashboard collector error:', err);
      }
    });

    collector.on('end', () => {
      response.edit({ components: [] }).catch(() => {});
    });
  }
};

function getHealthBar(score) {
  const filled = Math.round(score / 5);
  const empty = 20 - filled;
  return '`' + '█'.repeat(filled) + '░'.repeat(empty) + '` ' + score + '%';
}

async function buildOverview(guild, client, db, tc) {
  const totalMembers = guild.memberCount;
  const botCount = guild.members.cache.filter(m => m.user.bot).size;
  const humanCount = totalMembers - botCount;
  const onlineCount = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
  const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
  const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
  const roles = guild.roles.cache.size;
  const emojis = guild.emojis.cache.size;
  const boostCount = guild.premiumSubscriptionCount || 0;
  const openTickets = await db('tickets').where({ guild_id: guild.id, status: 'open' }).count('id as c').first();

  const healthScore = Math.min(100, Math.round(
    (onlineCount / Math.max(humanCount, 1) * 30) +
    (textChannels > 5 ? 20 : textChannels * 4) +
    (roles > 5 ? 15 : roles * 3) +
    (openTickets.c < 10 ? 20 : 10) +
    (boostCount > 0 ? 15 : 0)
  ));

  return new EmbedBuilder()
    .setColor(0x2f3136)
    .setTitle(`${guild.name} - Overview`)
    .setDescription(`**Server Health:** ${getHealthBar(healthScore)}`)
    .addFields(
      { name: 'Members', value: `Total: \`${totalMembers}\`\nHumans: \`${humanCount}\`\nBots: \`${botCount}\`\nOnline: \`${onlineCount}\``, inline: true },
      { name: 'Channels', value: `Text: \`${textChannels}\`\nVoice: \`${voiceChannels}\``, inline: true },
      { name: 'Server', value: `Roles: \`${roles}\`\nEmojis: \`${emojis}\`\nBoost: \`${boostCount}\``, inline: true },
      { name: 'Tickets', value: `Open: \`${openTickets.c}\``, inline: true },
      { name: 'Bot', value: `Commands: \`${client.commands.size}\`\nGuilds: \`${client.guilds.cache.size}\``, inline: true },
      { name: 'System', value: `Memory: \`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB\`\nUptime: \`${formatUptime(process.uptime())}\``, inline: true }
    )
    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
    .setTimestamp();
}

async function buildChannels(guild) {
  const textChannels = guild.channels.cache.filter(c => c.type === 0).sort((a, b) => a.position - b.position).first(15);
  const voiceChannels = guild.channels.cache.filter(c => c.type === 2).sort((a, b) => a.position - b.position).first(10);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${guild.name} - Channels`)
    .setDescription(
      '**Text Channels:**\n' +
      textChannels.map(c => {
        const locked = c.locked ? '🔒' : '';
        const nsfw = c.nsfw ? '🔞' : '';
        return `${locked}${nsfw} ${c} \`${c.id}\``;
      }).join('\n') +
      (voiceChannels.length ? '\n\n**Voice Channels:**\n' +
      voiceChannels.map(c => `🔊 ${c} \`${c.id}\``).join('\n') : '')
    )
    .setFooter({ text: `Showing ${textChannels.length + voiceChannels.length} of ${guild.channels.cache.size} channels` })
    .setTimestamp();

  return embed;
}

async function buildMembers(guild) {
  const members = guild.members.cache.sort((a, b) => b.joinedTimestamp - a.joinedTimestamp).first(15);
  const online = guild.members.cache.filter(m => m.presence?.status === 'online').size;
  const idle = guild.members.cache.filter(m => m.presence?.status === 'idle').size;
  const dnd = guild.members.cache.filter(m => m.presence?.status === 'dnd').size;
  const offline = guild.members.cache.filter(m => m.presence?.status === 'offline' || !m.presence).size;

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${guild.name} - Members`)
    .setDescription(
      '**Status:**\n' +
      `🟢 Online: \`${online}\` | 🟡 Idle: \`${idle}\` | 🔴 DND: \`${dnd}\` | ⚫ Offline: \`${offline}\`` +
      '\n\n**Recent Members:**\n' +
      members.map(m => `${m.user.bot ? '🤖' : '👤'} ${m.user.tag} \`${m.id}\``).join('\n')
    )
    .setFooter({ text: `Showing ${members.length} of ${guild.memberCount} members` })
    .setTimestamp();
}

async function buildRoles(guild) {
  const roles = guild.roles.cache.sort((a, b) => b.position - a.position).first(20);

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${guild.name} - Roles`)
    .setDescription(
      roles.map(r => `${r} - \`${r.members.size}\` members`).join('\n')
    )
    .setFooter({ text: `Showing ${roles.length} of ${guild.roles.cache.size} roles` })
    .setTimestamp();
}

async function buildSettings(guild, config) {
  const tc = config.ticket_config || {};

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${guild.name} - Settings`)
    .addFields(
      { name: 'Tickets', value: `Enabled: \`${tc.enabled ? 'Yes' : 'No'}\`\nCategory: ${tc.category ? `<#${tc.category}>` : '`Not set`'}\nLog: ${tc.log_channel ? `<#${tc.log_channel}>` : '`Not set`'}\nSupport Role: ${tc.support_role ? `<@&${tc.support_role}>` : '`Not set`'}`, inline: true },
      { name: 'Server Info', value: `Owner: <@${guild.ownerId}>\nCreated: <t:${Math.floor(guild.createdTimestamp / 1000)}:R>\nBoost: Tier \`${guild.premiumTier}\``, inline: true }
    )
    .setTimestamp();
}

async function buildTickets(db, guildId) {
  const total = await db('tickets').where({ guild_id: guildId }).count('id as c').first();
  const open = await db('tickets').where({ guild_id: guildId, status: 'open' }).count('id as c').first();
  const closed = await db('tickets').where({ guild_id: guildId, status: 'closed' }).count('id as c').first();

  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle('Ticket System')
    .addFields(
      { name: 'Total', value: `\`${total.c}\``, inline: true },
      { name: 'Open', value: `\`${open.c}\``, inline: true },
      { name: 'Closed', value: `\`${closed.c}\``, inline: true }
    )
    .setFooter({ text: 'Use !ticket panel to send the ticket panel' })
    .setTimestamp();
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}
