const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { addSecurityLog } = require('../../../db/securityRepository');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Complete antinuke protection system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // enable
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable antinuke protection'))
    // disable
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable antinuke protection'))
    // logging
    .addSubcommand(sub => sub.setName('logging').setDescription('Toggle antinuke logging')
      .addStringOption(opt => opt.setName('toggle').setDescription('Enable or disable').setRequired(true)
        .addChoices({ name: 'enable', value: 'enable' }, { name: 'disable', value: 'disable' })))
    // owner
    .addSubcommandGroup(group => group.setName('owner').setDescription('Manage antinuke owners')
      .addSubcommand(sub => sub.setName('add').setDescription('Add an owner')
        .addUserOption(opt => opt.setName('user').setDescription('User to add as owner').setRequired(true)))
      .addSubcommand(sub => sub.setName('remove').setDescription('Remove an owner')
        .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true)))
      .addSubcommand(sub => sub.setName('list').setDescription('List all owners'))
      .addSubcommand(sub => sub.setName('reset').setDescription('Remove all owners')))
    // punishment
    .addSubcommand(sub => sub.setName('punishment').setDescription('Set punishment type')
      .addStringOption(opt => opt.setName('type').setDescription('Punishment type').setRequired(true)
        .addChoices(
          { name: 'ban', value: 'ban' },
          { name: 'kick', value: 'kick' },
          { name: 'timeout', value: 'timeout' },
          { name: 'strip', value: 'strip' }
        )))
    // setup
    .addSubcommand(sub => sub.setName('setup').setDescription('Quick setup antinuke with defaults'))
    // status
    .addSubcommand(sub => sub.setName('status').setDescription('View antinuke status'))
    // whitelist
    .addSubcommandGroup(group => group.setName('whitelist').setDescription('Manage antinuke whitelist')
      .addSubcommand(sub => sub.setName('add').setDescription('Add user to whitelist')
        .addUserOption(opt => opt.setName('user').setDescription('User to whitelist').setRequired(true)))
      .addSubcommand(sub => sub.setName('remove').setDescription('Remove user from whitelist')
        .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true)))
      .addSubcommand(sub => sub.setName('show').setDescription('Show whitelisted users'))
      .addSubcommand(sub => sub.setName('reset').setDescription('Clear whitelist')))
    // wlrole
    .addSubcommandGroup(group => group.setName('wlrole').setDescription('Manage whitelist roles')
      .addSubcommand(sub => sub.setName('add').setDescription('Add role to whitelist')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to whitelist').setRequired(true)))
      .addSubcommand(sub => sub.setName('remove').setDescription('Remove role from whitelist')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true)))
      .addSubcommand(sub => sub.setName('list').setDescription('List whitelisted roles'))
      .addSubcommand(sub => sub.setName('reset').setDescription('Clear whitelisted roles')))
    // threshold
    .addSubcommandGroup(group => group.setName('threshold').setDescription('Configure action thresholds')
      .addSubcommand(sub => sub.setName('channel').setDescription('Set channel deletion threshold')
        .addIntegerOption(opt => opt.setName('count').setDescription('Max channels deleted').setRequired(true).setMinValue(1).setMaxValue(50))
        .addIntegerOption(opt => opt.setName('seconds').setDescription('Time window in seconds').setRequired(true).setMinValue(10).setMaxValue(300)))
      .addSubcommand(sub => sub.setName('role').setDescription('Set role modification threshold')
        .addIntegerOption(opt => opt.setName('count').setDescription('Max roles modified').setRequired(true).setMinValue(1).setMaxValue(50))
        .addIntegerOption(opt => opt.setName('seconds').setDescription('Time window in seconds').setRequired(true).setMinValue(10).setMaxValue(300)))
      .addSubcommand(sub => sub.setName('member').setDescription('Set member kick/ban threshold')
        .addIntegerOption(opt => opt.setName('count').setDescription('Max members kicked/banned').setRequired(true).setMinValue(1).setMaxValue(50))
        .addIntegerOption(opt => opt.setName('seconds').setDescription('Time window in seconds').setRequired(true).setMinValue(10).setMaxValue(300)))
      .addSubcommand(sub => sub.setName('view').setDescription('View all current thresholds')))
    // timeout
    .addSubcommandGroup(group => group.setName('timeout').setDescription('Configure timeout settings')
      .addSubcommand(sub => sub.setName('duration').setDescription('Set default timeout duration')
        .addIntegerOption(opt => opt.setName('minutes').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(40320)))
      .addSubcommand(sub => sub.setName('view').setDescription('View timeout settings'))),

  cooldown: 5,
  aliases: ['an', 'nukeshield'],
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
        if (['enable', 'disable', 'logging', 'punishment', 'setup', 'status'].includes(raw)) {
          subcommand = raw;
        } else if (raw === 'owner' && ['add', 'remove', 'list', 'reset'].includes(raw2)) {
          subcommandGroup = 'owner';
          subcommand = raw2;
        } else if (raw === 'whitelist' && ['add', 'remove', 'show', 'reset'].includes(raw2)) {
          subcommandGroup = 'whitelist';
          subcommand = raw2;
        } else if (raw === 'wlrole' && ['add', 'remove', 'list', 'reset'].includes(raw2)) {
          subcommandGroup = 'wlrole';
          subcommand = raw2;
        } else if (raw === 'owner') {
          subcommandGroup = 'owner';
          subcommand = 'list';
        } else if (raw === 'whitelist' || raw === 'wl') {
          subcommandGroup = 'whitelist';
          subcommand = 'show';
        } else if (raw === 'wlrole' || raw === 'wlr') {
          subcommandGroup = 'wlrole';
          subcommand = 'list';
        } else if (raw === 'threshold' && ['channel', 'role', 'member', 'view'].includes(raw2)) {
          subcommandGroup = 'threshold';
          subcommand = raw2;
        } else if (raw === 'timeout' && ['duration', 'view'].includes(raw2)) {
          subcommandGroup = 'timeout';
          subcommand = raw2;
        } else {
          subcommand = 'status';
        }
      }

      const guildData = await getGuild(guild.id);

      // ===== ENABLE =====
      if (subcommand === 'enable') {
        await updateGuild(guild.id, { antinuke_enabled: true });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antinuke_enabled', type: 'antinuke', details: '{}' });
        return reply({ embeds: [successEmbed('Antinuke Enabled', '✅ Antinuke protection is now **enabled**.')] });
      }

      // ===== DISABLE =====
      if (subcommand === 'disable') {
        await updateGuild(guild.id, { antinuke_enabled: false });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antinuke_disabled', type: 'antinuke', details: '{}' });
        return reply({ embeds: [errorEmbed('Antinuke Disabled', '❌ Antinuke protection is now **disabled**.')] });
      }

      // ===== LOGGING =====
      if (subcommand === 'logging') {
        const toggle = isSlash ? interaction.options.getString('toggle') : (args?.[1] || 'enable').toLowerCase();
        const enabled = toggle === 'enable';
        await updateGuild(guild.id, { antinuke_logging: enabled });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: `antinuke_logging_${toggle}`, type: 'antinuke', details: '{}' });
        return reply({ embeds: [successEmbed('Antinuke Logging', `Logging has been **${enabled ? 'enabled' : 'disabled'}**.`)] });
      }

      // ===== OWNER ADD =====
      if (subcommandGroup === 'owner' && subcommand === 'add') {
        const target = isSlash ? interaction.options.getUser('user') : guild.members.cache.get(args?.[2]?.replace(/[<@!>]/g, ''));
        if (!target) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid user.')] });
        let owners = JSON.parse(guildData.antinuke_owners || '[]');
        if (owners.includes(target.id)) return reply({ embeds: [warningEmbed('Warning', 'User is already an owner.')] });
        owners.push(target.id);
        await updateGuild(guild.id, { antinuke_owners: JSON.stringify(owners) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antinuke_owner_add', type: 'antinuke', details: JSON.stringify({ target: target.id }) });
        return reply({ embeds: [successEmbed('Owner Added', `<@${target.id}> has been added as an antinuke owner.`)] });
      }

      // ===== OWNER REMOVE =====
      if (subcommandGroup === 'owner' && subcommand === 'remove') {
        const target = isSlash ? interaction.options.getUser('user') : guild.members.cache.get(args?.[2]?.replace(/[<@!>]/g, ''));
        if (!target) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid user.')] });
        let owners = JSON.parse(guildData.antinuke_owners || '[]');
        owners = owners.filter(id => id !== target.id);
        await updateGuild(guild.id, { antinuke_owners: JSON.stringify(owners) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antinuke_owner_remove', type: 'antinuke', details: JSON.stringify({ target: target.id }) });
        return reply({ embeds: [successEmbed('Owner Removed', `<@${target.id}> has been removed from antinuke owners.`)] });
      }

      // ===== OWNER LIST =====
      if (subcommandGroup === 'owner' && subcommand === 'list') {
        const owners = JSON.parse(guildData.antinuke_owners || '[]');
        if (owners.length === 0) return reply({ embeds: [infoEmbed('Antinuke Owners', 'No owners configured. Use `antinuke owner add` to add one.')] });
        const list = owners.map(id => `<@${id}>`).join('\n');
        return reply({ embeds: [successEmbed('Antinuke Owners', list)] });
      }

      // ===== OWNER RESET =====
      if (subcommandGroup === 'owner' && subcommand === 'reset') {
        await updateGuild(guild.id, { antinuke_owners: '[]' });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antinuke_owner_reset', type: 'antinuke', details: '{}' });
        return reply({ embeds: [successEmbed('Owners Reset', 'All antinuke owners have been removed.')] });
      }

      // ===== PUNISHMENT =====
      if (subcommand === 'punishment') {
        const type = isSlash ? interaction.options.getString('type') : (args?.[1] || 'ban').toLowerCase();
        if (!['ban', 'kick', 'timeout', 'strip'].includes(type)) {
          return reply({ embeds: [errorEmbed('Error', 'Valid punishments: ban, kick, timeout, strip')] });
        }
        await updateGuild(guild.id, { antinuke_punishment: type });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antinuke_punishment_set', type: 'antinuke', details: JSON.stringify({ punishment: type }) });
        return reply({ embeds: [successEmbed('Punishment Set', `Antinuke punishment set to **${type}**.`)] });
      }

      // ===== SETUP =====
      if (subcommand === 'setup') {
        await updateGuild(guild.id, {
          antinuke_enabled: true,
          antinuke_logging: true,
          antinuke_punishment: 'ban',
          antinuke_owners: JSON.stringify([user.id])
        });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antinuke_setup', type: 'antinuke', details: '{}' });
        const embed = successEmbed('Antinuke Setup Complete', [
          '✅ **Protection**: Enabled',
          '✅ **Logging**: Enabled',
          '✅ **Punishment**: Ban',
          `✅ **Owner**: <@${user.id}>`,
          '',
          'Use `antinuke status` to view your configuration.'
        ].join('\n'));
        return reply({ embeds: [embed] });
      }

      // ===== STATUS =====
      if (subcommand === 'status') {
        const enabled = guildData.antinuke_enabled;
        const logging = guildData.antinuke_logging;
        const punishment = guildData.antinuke_punishment || 'ban';
        const owners = JSON.parse(guildData.antinuke_owners || '[]');
        const whitelist = JSON.parse(guildData.whitelist || '[]');
        const wlRoles = JSON.parse(guildData.antinuke_wl_roles || '[]');

        const embed = infoEmbed('🛡️ Antinuke Status', `Status for **${guild.name}**`);
        embed.addFields(
          { name: 'Protection', value: enabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
          { name: 'Logging', value: logging ? '🟢 Enabled' : '🔴 Disabled', inline: true },
          { name: 'Punishment', value: punishment.toUpperCase(), inline: true },
          { name: 'Owners', value: owners.length > 0 ? owners.map(id => `<@${id}>`).join(', ') : 'None', inline: false },
          { name: 'Whitelisted Users', value: whitelist.length > 0 ? whitelist.map(id => `<@${id}>`).join(', ') : 'None', inline: false },
          { name: 'Whitelisted Roles', value: wlRoles.length > 0 ? wlRoles.map(id => `<@&${id}>`).join(', ') : 'None', inline: false }
        );
        return reply({ embeds: [embed] });
      }

      // ===== WHITELIST ADD =====
      if (subcommandGroup === 'whitelist' && subcommand === 'add') {
        if (user.id !== process.env.OWNER_ID) return reply({ embeds: [errorEmbed('Error', '❌ Only the bot owner can manage the security whitelist.')] });
        const target = isSlash ? interaction.options.getUser('user') : guild.members.cache.get(args?.[2]?.replace(/[<@!>]/g, ''));
        if (!target) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid user.')] });
        let wl = JSON.parse(guildData.whitelist || '[]');
        if (wl.includes(target.id)) return reply({ embeds: [warningEmbed('Warning', 'User is already whitelisted.')] });
        wl.push(target.id);
        await updateGuild(guild.id, { whitelist: JSON.stringify(wl) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antinuke_whitelist_add', type: 'antinuke', details: JSON.stringify({ target: target.id }) });
        return reply({ embeds: [successEmbed('Whitelist Added', `<@${target.id}> has been whitelisted.`)] });
      }

      // ===== WHITELIST REMOVE =====
      if (subcommandGroup === 'whitelist' && subcommand === 'remove') {
        if (user.id !== process.env.OWNER_ID) return reply({ embeds: [errorEmbed('Error', '❌ Only the bot owner can manage the security whitelist.')] });
        const target = isSlash ? interaction.options.getUser('user') : guild.members.cache.get(args?.[2]?.replace(/[<@!>]/g, ''));
        if (!target) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid user.')] });
        let wl = JSON.parse(guildData.whitelist || '[]');
        wl = wl.filter(id => id !== target.id);
        await updateGuild(guild.id, { whitelist: JSON.stringify(wl) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antinuke_whitelist_remove', type: 'antinuke', details: JSON.stringify({ target: target.id }) });
        return reply({ embeds: [successEmbed('Whitelist Removed', `<@${target.id}> has been removed from the whitelist.`)] });
      }

      // ===== WHITELIST SHOW =====
      if (subcommandGroup === 'whitelist' && subcommand === 'show') {
        if (user.id !== process.env.OWNER_ID) return reply({ embeds: [errorEmbed('Error', '❌ Only the bot owner can view the security whitelist.')] });
        const wl = JSON.parse(guildData.whitelist || '[]');
        if (wl.length === 0) return reply({ embeds: [infoEmbed('Whitelist', 'No users are whitelisted.')] });
        const list = wl.map(id => `<@${id}>`).join('\n');
        return reply({ embeds: [successEmbed('Whitelisted Users', list)] });
      }

      // ===== WHITELIST RESET =====
      if (subcommandGroup === 'whitelist' && subcommand === 'reset') {
        if (user.id !== process.env.OWNER_ID) return reply({ embeds: [errorEmbed('Error', '❌ Only the bot owner can clear the security whitelist.')] });
        await updateGuild(guild.id, { whitelist: '[]' });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antinuke_whitelist_reset', type: 'antinuke', details: '{}' });
        return reply({ embeds: [successEmbed('Whitelist Cleared', 'All whitelisted users have been removed.')] });
      }

      // ===== WLROLE ADD =====
      if (subcommandGroup === 'wlrole' && subcommand === 'add') {
        const target = isSlash ? interaction.options.getRole('role') : guild.roles.cache.get(args?.[2]?.replace(/[<@&>]/g, ''));
        if (!target) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid role.')] });
        let wlRoles = JSON.parse(guildData.antinuke_wl_roles || '[]');
        if (wlRoles.includes(target.id)) return reply({ embeds: [warningEmbed('Warning', 'Role is already whitelisted.')] });
        wlRoles.push(target.id);
        await updateGuild(guild.id, { antinuke_wl_roles: JSON.stringify(wlRoles) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antinuke_wlrole_add', type: 'antinuke', details: JSON.stringify({ role: target.id }) });
        return reply({ embeds: [successEmbed('Role Whitelisted', `<@&${target.id}> has been added to the whitelist.`)] });
      }

      // ===== WLROLE REMOVE =====
      if (subcommandGroup === 'wlrole' && subcommand === 'remove') {
        const target = isSlash ? interaction.options.getRole('role') : guild.roles.cache.get(args?.[2]?.replace(/[<@&>]/g, ''));
        if (!target) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid role.')] });
        let wlRoles = JSON.parse(guildData.antinuke_wl_roles || '[]');
        wlRoles = wlRoles.filter(id => id !== target.id);
        await updateGuild(guild.id, { antinuke_wl_roles: JSON.stringify(wlRoles) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antinuke_wlrole_remove', type: 'antinuke', details: JSON.stringify({ role: target.id }) });
        return reply({ embeds: [successEmbed('Role Removed', `<@&${target.id}> has been removed from the whitelist.`)] });
      }

      // ===== WLROLE LIST =====
      if (subcommandGroup === 'wlrole' && subcommand === 'list') {
        const wlRoles = JSON.parse(guildData.antinuke_wl_roles || '[]');
        if (wlRoles.length === 0) return reply({ embeds: [infoEmbed('Whitelisted Roles', 'No roles are whitelisted.')] });
        const list = wlRoles.map(id => `<@&${id}>`).join('\n');
        return reply({ embeds: [successEmbed('Whitelisted Roles', list)] });
      }

      // ===== WLROLE RESET =====
      if (subcommandGroup === 'wlrole' && subcommand === 'reset') {
        await updateGuild(guild.id, { antinuke_wl_roles: '[]' });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antinuke_wlrole_reset', type: 'antinuke', details: '{}' });
        return reply({ embeds: [successEmbed('Roles Cleared', 'All whitelisted roles have been removed.')] });
      }

      // ===== THRESHOLD CHANNEL =====
      if (subcommandGroup === 'threshold' && subcommand === 'channel') {
        const count = isSlash ? interaction.options.getInteger('count') : parseInt(args?.[2]);
        const seconds = isSlash ? interaction.options.getInteger('seconds') : parseInt(args?.[3]);
        if (!count || !seconds || isNaN(count) || isNaN(seconds)) {
          return reply({ embeds: [errorEmbed('Error', 'Please provide valid count and seconds.')] });
        }
        const securityEngine = require('../../../utils/securityEngine');
        await securityEngine.setThreshold(guild.id, 'channel', count, seconds);
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antinuke_threshold_channel', type: 'antinuke', details: JSON.stringify({ count, seconds }) });
        return reply({ embeds: [successEmbed('Threshold Set', `Channel deletion threshold: **${count}** channels in **${seconds}s**`)] });
      }

      // ===== THRESHOLD ROLE =====
      if (subcommandGroup === 'threshold' && subcommand === 'role') {
        const count = isSlash ? interaction.options.getInteger('count') : parseInt(args?.[2]);
        const seconds = isSlash ? interaction.options.getInteger('seconds') : parseInt(args?.[3]);
        if (!count || !seconds || isNaN(count) || isNaN(seconds)) {
          return reply({ embeds: [errorEmbed('Error', 'Please provide valid count and seconds.')] });
        }
        const securityEngine = require('../../../utils/securityEngine');
        await securityEngine.setThreshold(guild.id, 'role', count, seconds);
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antinuke_threshold_role', type: 'antinuke', details: JSON.stringify({ count, seconds }) });
        return reply({ embeds: [successEmbed('Threshold Set', `Role modification threshold: **${count}** roles in **${seconds}s**`)] });
      }

      // ===== THRESHOLD MEMBER =====
      if (subcommandGroup === 'threshold' && subcommand === 'member') {
        const count = isSlash ? interaction.options.getInteger('count') : parseInt(args?.[2]);
        const seconds = isSlash ? interaction.options.getInteger('seconds') : parseInt(args?.[3]);
        if (!count || !seconds || isNaN(count) || isNaN(seconds)) {
          return reply({ embeds: [errorEmbed('Error', 'Please provide valid count and seconds.')] });
        }
        const securityEngine = require('../../../utils/securityEngine');
        await securityEngine.setThreshold(guild.id, 'member', count, seconds);
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antinuke_threshold_member', type: 'antinuke', details: JSON.stringify({ count, seconds }) });
        return reply({ embeds: [successEmbed('Threshold Set', `Member action threshold: **${count}** members in **${seconds}s**`)] });
      }

      // ===== THRESHOLD VIEW =====
      if (subcommandGroup === 'threshold' && subcommand === 'view') {
        const securityEngine = require('../../../utils/securityEngine');
        const thresholds = await securityEngine.getThresholds(guild.id);
        const ch = thresholds?.channel || { count: 3, seconds: 60 };
        const ro = thresholds?.role || { count: 3, seconds: 60 };
        const me = thresholds?.member || { count: 5, seconds: 60 };
        const embed = infoEmbed('⚡ Antinuke Thresholds', [
          `**Channel Deletion:** ${ch.count} channels in ${ch.seconds}s`,
          `**Role Modification:** ${ro.count} roles in ${ro.seconds}s`,
          `**Member Actions:** ${me.count} members in ${me.seconds}s`
        ].join('\n'));
        return reply({ embeds: [embed] });
      }

      // ===== TIMEOUT DURATION =====
      if (subcommandGroup === 'timeout' && subcommand === 'duration') {
        const minutes = isSlash ? interaction.options.getInteger('minutes') : parseInt(args?.[2]);
        if (!minutes || isNaN(minutes)) {
          return reply({ embeds: [errorEmbed('Error', 'Please provide valid minutes.')] });
        }
        await updateGuild(guild.id, { antinuke_timeout_duration: minutes });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antinuke_timeout_duration', type: 'antinuke', details: JSON.stringify({ minutes }) });
        return reply({ embeds: [successEmbed('Timeout Duration Set', `Default timeout duration set to **${minutes} minutes**`)] });
      }

      // ===== TIMEOUT VIEW =====
      if (subcommandGroup === 'timeout' && subcommand === 'view') {
        const duration = guildData.antinuke_timeout_duration || 10;
        const embed = infoEmbed('⏰ Timeout Settings', `Default timeout duration: **${duration} minutes**`);
        return reply({ embeds: [embed] });
      }

    } catch (error) {
      console.error(error);
      return reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
    }
  }
};
