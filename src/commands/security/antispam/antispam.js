const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { addSecurityLog } = require('../../../db/securityRepository');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispam')
    .setDescription('Complete antispam protection system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable antispam protection'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable antispam protection'))
    .addSubcommand(sub => sub.setName('status').setDescription('View antispam status'))
    .addSubcommand(sub => sub.setName('setup').setDescription('Quick setup antispam with defaults'))
    .addSubcommand(sub => sub.setName('action').setDescription('Set punishment action')
      .addStringOption(opt => opt.setName('type').setDescription('Action type').setRequired(true)
        .addChoices(
          { name: 'warn', value: 'warn' },
          { name: 'mute', value: 'mute' },
          { name: 'kick', value: 'kick' },
          { name: 'ban', value: 'ban' },
          { name: 'timeout', value: 'timeout' }
        )))
    .addSubcommand(sub => sub.setName('limit').setDescription('Set message limit')
      .addIntegerOption(opt => opt.setName('count').setDescription('Max messages').setRequired(true).setMinValue(1).setMaxValue(50))
      .addIntegerOption(opt => opt.setName('seconds').setDescription('Time window in seconds').setMinValue(1).setMaxValue(60)))
    .addSubcommand(sub => sub.setName('duration').setDescription('Set mute/timeout duration')
      .addIntegerOption(opt => opt.setName('minutes').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(40320)))
    .addSubcommand(sub => sub.setName('punishlevel').setDescription('Set escalating punishment')
      .addStringOption(opt => opt.setName('mode').setDescription('Punishment escalation mode').setRequired(true)
        .addChoices(
          { name: 'none', value: 'none' },
          { name: 'escalate', value: 'escalate' }
        )))
    .addSubcommandGroup(group => group.setName('ignore').setDescription('Manage ignore list')
      .addSubcommand(sub => sub.setName('user').setDescription('Add/remove user from ignore')
        .addStringOption(opt => opt.setName('action').setDescription('Add or remove').setRequired(true)
          .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }))
        .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)))
      .addSubcommand(sub => sub.setName('channel').setDescription('Add/remove channel from ignore')
        .addStringOption(opt => opt.setName('action').setDescription('Add or remove').setRequired(true)
          .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }))
        .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true)))
      .addSubcommand(sub => sub.setName('role').setDescription('Add/remove role from ignore')
        .addStringOption(opt => opt.setName('action').setDescription('Add or remove').setRequired(true)
          .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }))
        .addRoleOption(opt => opt.setName('role').setDescription('Target role').setRequired(true)))
      .addSubcommand(sub => sub.setName('show').setDescription('Show all ignored users/channels/roles')))
    .addSubcommandGroup(group => group.setName('bypass').setDescription('Manage bypass roles')
      .addSubcommand(sub => sub.setName('add').setDescription('Add bypass role')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to bypass').setRequired(true)))
      .addSubcommand(sub => sub.setName('remove').setDescription('Remove bypass role')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true)))
      .addSubcommand(sub => sub.setName('list').setDescription('List bypass roles'))
      .addSubcommand(sub => sub.setName('reset').setDescription('Clear bypass roles'))),

  cooldown: 5,
  aliases: ['as', 'spamguard'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const user = isSlash ? interaction.user : interaction.author;
    const member = isSlash ? interaction.member : guild.members.cache.get(user.id);
    const reply = (opts) => isSlash ? interaction.reply(opts) : interaction.channel.send(opts);

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
        if (['enable', 'disable', 'status', 'setup', 'action', 'limit', 'duration', 'punishlevel'].includes(raw)) {
          subcommand = raw;
        } else if (raw === 'ignore' && ['user', 'channel', 'role', 'show'].includes(raw2)) {
          subcommandGroup = 'ignore';
          subcommand = raw2;
        } else if (raw === 'bypass' && ['add', 'remove', 'list', 'reset'].includes(raw2)) {
          subcommandGroup = 'bypass';
          subcommand = raw2;
        } else if (raw === 'ignore') {
          subcommandGroup = 'ignore';
          subcommand = 'show';
        } else {
          subcommand = 'status';
        }
      }

      const guildData = await getGuild(guild.id);

      // ===== ENABLE =====
      if (subcommand === 'enable') {
        await updateGuild(guild.id, { antispam_enabled: true });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antispam_enabled', type: 'antispam', details: '{}' });
        return reply({ embeds: [successEmbed('Antispam Enabled', '✅ Antispam protection is now **enabled**.')] });
      }

      // ===== DISABLE =====
      if (subcommand === 'disable') {
        await updateGuild(guild.id, { antispam_enabled: false });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antispam_disabled', type: 'antispam', details: '{}' });
        return reply({ embeds: [errorEmbed('Antispam Disabled', '❌ Antispam protection is now **disabled**.')] });
      }

      // ===== STATUS =====
      if (subcommand === 'status') {
        const enabled = guildData.antispam_enabled;
        const asConfig = JSON.parse(guildData.antispam_config || '{}');
        const embed = infoEmbed('🛡️ Antispam Status', `Status for **${guild.name}**`);
        embed.addFields(
          { name: 'Protection', value: enabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
          { name: 'Message Limit', value: `${asConfig.messageLimit || 5} msgs`, inline: true },
          { name: 'Time Window', value: `${(asConfig.timeWindow || 5000) / 1000}s`, inline: true },
          { name: 'Action', value: (asConfig.action || 'mute').toUpperCase(), inline: true },
          { name: 'Duration', value: `${asConfig.duration || 5} min`, inline: true },
          { name: 'Punish Level', value: (asConfig.punishLevel || 'none').toUpperCase(), inline: true },
          { name: 'Ignored Users', value: (asConfig.ignore || []).length > 0 ? `${(asConfig.ignore || []).length} users` : 'None', inline: true },
          { name: 'Ignored Channels', value: (asConfig.ignoredChannels || []).length > 0 ? `${(asConfig.ignoredChannels || []).length} channels` : 'None', inline: true },
          { name: 'Ignored Roles', value: (asConfig.ignoredRoles || []).length > 0 ? `${(asConfig.ignoredRoles || []).length} roles` : 'None', inline: true }
        );
        return reply({ embeds: [embed] });
      }

      // ===== SETUP =====
      if (subcommand === 'setup') {
        await updateGuild(guild.id, {
          antispam_enabled: true,
          antispam_config: JSON.stringify({
            messageLimit: 5,
            timeWindow: 5000,
            action: 'mute',
            duration: 5,
            punishLevel: 'none'
          })
        });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antispam_setup', type: 'antispam', details: '{}' });
        return reply({ embeds: [successEmbed('Antispam Setup Complete', [
          '✅ **Protection**: Enabled',
          '✅ **Message Limit**: 5 msgs / 5s',
          '✅ **Action**: Mute',
          '✅ **Duration**: 5 min',
          '',
          'Use `antispam status` to view your configuration.'
        ].join('\n'))] });
      }

      // ===== ACTION =====
      if (subcommand === 'action') {
        const type = isSlash ? interaction.options.getString('type') : (args?.[1] || 'mute').toLowerCase();
        if (!['warn', 'mute', 'kick', 'ban', 'timeout'].includes(type)) {
          return reply({ embeds: [errorEmbed('Error', 'Valid actions: warn, mute, kick, ban, timeout')] });
        }
        let asConfig = JSON.parse(guildData.antispam_config || '{}');
        asConfig.action = type;
        await updateGuild(guild.id, { antispam_config: JSON.stringify(asConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antispam_action_set', type: 'antispam', details: JSON.stringify({ action: type }) });
        return reply({ embeds: [successEmbed('Action Set', `Antispam action set to **${type}**.`)] });
      }

      // ===== LIMIT =====
      if (subcommand === 'limit') {
        const count = isSlash ? interaction.options.getInteger('count') : parseInt(args?.[1]);
        const seconds = isSlash ? interaction.options.getInteger('seconds') : parseInt(args?.[2]);
        if (!count || isNaN(count)) {
          return reply({ embeds: [errorEmbed('Error', 'Please provide a valid message count.')] });
        }
        let asConfig = JSON.parse(guildData.antispam_config || '{}');
        asConfig.messageLimit = count;
        if (seconds && !isNaN(seconds)) asConfig.timeWindow = seconds * 1000;
        await updateGuild(guild.id, { antispam_config: JSON.stringify(asConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antispam_limit_set', type: 'antispam', details: JSON.stringify({ count, seconds }) });
        return reply({ embeds: [successEmbed('Limit Set', `Message limit: **${count}** msgs${seconds ? ` in **${seconds}s**` : ''}`)] });
      }

      // ===== DURATION =====
      if (subcommand === 'duration') {
        const minutes = isSlash ? interaction.options.getInteger('minutes') : parseInt(args?.[1]);
        if (!minutes || isNaN(minutes)) {
          return reply({ embeds: [errorEmbed('Error', 'Please provide a valid duration.')] });
        }
        let asConfig = JSON.parse(guildData.antispam_config || '{}');
        asConfig.duration = minutes;
        await updateGuild(guild.id, { antispam_config: JSON.stringify(asConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antispam_duration_set', type: 'antispam', details: JSON.stringify({ minutes }) });
        return reply({ embeds: [successEmbed('Duration Set', `Mute/timeout duration set to **${minutes} minutes**.`)] });
      }

      // ===== PUNISH LEVEL =====
      if (subcommand === 'punishlevel') {
        const mode = isSlash ? interaction.options.getString('mode') : (args?.[1] || 'none').toLowerCase();
        if (!['none', 'escalate'].includes(mode)) {
          return reply({ embeds: [errorEmbed('Error', 'Valid modes: none, escalate')] });
        }
        let asConfig = JSON.parse(guildData.antispam_config || '{}');
        asConfig.punishLevel = mode;
        await updateGuild(guild.id, { antispam_config: JSON.stringify(asConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antispam_punishlevel_set', type: 'antispam', details: JSON.stringify({ mode }) });
        return reply({ embeds: [successEmbed('Punish Level Set', `Punishment escalation set to **${mode}**.`)] });
      }

      // ===== IGNORE USER =====
      if (subcommandGroup === 'ignore' && subcommand === 'user') {
        const target = isSlash ? interaction.options.getUser('user') : guild.members.cache.get(args?.[2]?.replace(/[<@!>]/g, ''));
        const action = isSlash ? interaction.options.getString('action') : (args?.[1] || 'add').toLowerCase();
        if (!target) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid user.')] });
        let asConfig = JSON.parse(guildData.antispam_config || '{}');
        let ignore = asConfig.ignore || [];
        if (action === 'add') {
          if (ignore.includes(target.id)) return reply({ embeds: [warningEmbed('Warning', 'User is already ignored.')] });
          ignore.push(target.id);
        } else {
          ignore = ignore.filter(id => id !== target.id);
        }
        asConfig.ignore = ignore;
        await updateGuild(guild.id, { antispam_config: JSON.stringify(asConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: `antispam_ignore_user_${action}`, type: 'antispam', details: JSON.stringify({ target: target.id }) });
        return reply({ embeds: [successEmbed('Ignore Updated', `<@${target.id}> ${action === 'add' ? 'added to' : 'removed from'} ignore list.`)] });
      }

      // ===== IGNORE CHANNEL =====
      if (subcommandGroup === 'ignore' && subcommand === 'channel') {
        const target = isSlash ? interaction.options.getChannel('channel') : guild.channels.cache.get(args?.[2]?.replace(/[<#>]/g, ''));
        const action = isSlash ? interaction.options.getString('action') : (args?.[1] || 'add').toLowerCase();
        if (!target) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid channel.')] });
        let asConfig = JSON.parse(guildData.antispam_config || '{}');
        let ignoredChannels = asConfig.ignoredChannels || [];
        if (action === 'add') {
          if (ignoredChannels.includes(target.id)) return reply({ embeds: [warningEmbed('Warning', 'Channel is already ignored.')] });
          ignoredChannels.push(target.id);
        } else {
          ignoredChannels = ignoredChannels.filter(id => id !== target.id);
        }
        asConfig.ignoredChannels = ignoredChannels;
        await updateGuild(guild.id, { antispam_config: JSON.stringify(asConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: `antispam_ignore_channel_${action}`, type: 'antispam', details: JSON.stringify({ channel: target.id }) });
        return reply({ embeds: [successEmbed('Ignore Updated', `<#${target.id}> ${action === 'add' ? 'added to' : 'removed from'} ignore list.`)] });
      }

      // ===== IGNORE ROLE =====
      if (subcommandGroup === 'ignore' && subcommand === 'role') {
        const target = isSlash ? interaction.options.getRole('role') : guild.roles.cache.get(args?.[2]?.replace(/[<@&>]/g, ''));
        const action = isSlash ? interaction.options.getString('action') : (args?.[1] || 'add').toLowerCase();
        if (!target) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid role.')] });
        let asConfig = JSON.parse(guildData.antispam_config || '{}');
        let ignoredRoles = asConfig.ignoredRoles || [];
        if (action === 'add') {
          if (ignoredRoles.includes(target.id)) return reply({ embeds: [warningEmbed('Warning', 'Role is already ignored.')] });
          ignoredRoles.push(target.id);
        } else {
          ignoredRoles = ignoredRoles.filter(id => id !== target.id);
        }
        asConfig.ignoredRoles = ignoredRoles;
        await updateGuild(guild.id, { antispam_config: JSON.stringify(asConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: `antispam_ignore_role_${action}`, type: 'antispam', details: JSON.stringify({ role: target.id }) });
        return reply({ embeds: [successEmbed('Ignore Updated', `<@&${target.id}> ${action === 'add' ? 'added to' : 'removed from'} ignore list.`)] });
      }

      // ===== IGNORE SHOW =====
      if (subcommandGroup === 'ignore' && subcommand === 'show') {
        let asConfig = JSON.parse(guildData.antispam_config || '{}');
        const ignoredUsers = (asConfig.ignore || []).map(id => `<@${id}>`).join(', ') || 'None';
        const ignoredChannels = (asConfig.ignoredChannels || []).map(id => `<#${id}>`).join(', ') || 'None';
        const ignoredRoles = (asConfig.ignoredRoles || []).map(id => `<@&${id}>`).join(', ') || 'None';
        return reply({ embeds: [infoEmbed('Antispam Ignore List', [
          `**Users:** ${ignoredUsers}`,
          `**Channels:** ${ignoredChannels}`,
          `**Roles:** ${ignoredRoles}`
        ].join('\n'))] });
      }

      // ===== BYPASS ADD =====
      if (subcommandGroup === 'bypass' && subcommand === 'add') {
        const target = isSlash ? interaction.options.getRole('role') : guild.roles.cache.get(args?.[2]?.replace(/[<@&>]/g, ''));
        if (!target) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid role.')] });
        let asConfig = JSON.parse(guildData.antispam_config || '{}');
        let bypassRoles = asConfig.bypassRoles || [];
        if (bypassRoles.includes(target.id)) return reply({ embeds: [warningEmbed('Warning', 'Role already bypasses antispam.')] });
        bypassRoles.push(target.id);
        asConfig.bypassRoles = bypassRoles;
        await updateGuild(guild.id, { antispam_config: JSON.stringify(asConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antispam_bypass_add', type: 'antispam', details: JSON.stringify({ role: target.id }) });
        return reply({ embeds: [successEmbed('Bypass Added', `<@&${target.id}> now bypasses antispam.`)] });
      }

      // ===== BYPASS REMOVE =====
      if (subcommandGroup === 'bypass' && subcommand === 'remove') {
        const target = isSlash ? interaction.options.getRole('role') : guild.roles.cache.get(args?.[2]?.replace(/[<@&>]/g, ''));
        if (!target) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid role.')] });
        let asConfig = JSON.parse(guildData.antispam_config || '{}');
        let bypassRoles = (asConfig.bypassRoles || []).filter(id => id !== target.id);
        asConfig.bypassRoles = bypassRoles;
        await updateGuild(guild.id, { antispam_config: JSON.stringify(asConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antispam_bypass_remove', type: 'antispam', details: JSON.stringify({ role: target.id }) });
        return reply({ embeds: [successEmbed('Bypass Removed', `<@&${target.id}> no longer bypasses antispam.`)] });
      }

      // ===== BYPASS LIST =====
      if (subcommandGroup === 'bypass' && subcommand === 'list') {
        let asConfig = JSON.parse(guildData.antispam_config || '{}');
        const bypassRoles = (asConfig.bypassRoles || []).map(id => `<@&${id}>`).join('\n') || 'None';
        return reply({ embeds: [successEmbed('Bypass Roles', bypassRoles)] });
      }

      // ===== BYPASS RESET =====
      if (subcommandGroup === 'bypass' && subcommand === 'reset') {
        let asConfig = JSON.parse(guildData.antispam_config || '{}');
        asConfig.bypassRoles = [];
        await updateGuild(guild.id, { antispam_config: JSON.stringify(asConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antispam_bypass_reset', type: 'antispam', details: '{}' });
        return reply({ embeds: [successEmbed('Bypass Cleared', 'All bypass roles have been removed.')] });
      }

    } catch (error) {
      console.error(error);
      return reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
    }
  }
};
