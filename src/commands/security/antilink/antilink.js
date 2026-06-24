const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { addSecurityLog } = require('../../../db/securityRepository');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilink')
    .setDescription('Complete antilink protection system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable antilink protection'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable antilink protection'))
    .addSubcommand(sub => sub.setName('status').setDescription('View antilink status'))
    .addSubcommand(sub => sub.setName('setup').setDescription('Quick setup antilink with defaults'))
    .addSubcommand(sub => sub.setName('action').setDescription('Set punishment action')
      .addStringOption(opt => opt.setName('type').setDescription('Action type').setRequired(true)
        .addChoices(
          { name: 'delete', value: 'delete' },
          { name: 'warn', value: 'warn' },
          { name: 'mute', value: 'mute' },
          { name: 'kick', value: 'kick' },
          { name: 'ban', value: 'ban' },
          { name: 'timeout', value: 'timeout' }
        )))
    .addSubcommand(sub => sub.setName('mode').setDescription('Set link blocking mode')
      .addStringOption(opt => opt.setName('mode').setDescription('Blocking mode').setRequired(true)
        .addChoices(
          { name: 'invites', value: 'invites' },
          { name: 'allurls', value: 'allurls' },
          { name: 'both', value: 'both' }
        )))
    .addSubcommand(sub => sub.setName('whitelistdomain').setDescription('Add/remove whitelisted domain')
      .addStringOption(opt => opt.setName('action').setDescription('Add or remove').setRequired(true)
        .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }))
      .addStringOption(opt => opt.setName('domain').setDescription('Domain (e.g. youtube.com)').setRequired(true)))
    .addSubcommand(sub => sub.setName('duration').setDescription('Set mute duration')
      .addIntegerOption(opt => opt.setName('minutes').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(40320)))
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
      .addSubcommand(sub => sub.setName('show').setDescription('Show all ignored users/channels/roles'))),

  cooldown: 5,
  aliases: ['al', 'linkguard'],
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
        if (['enable', 'disable', 'status', 'setup', 'action', 'mode', 'whitelistdomain', 'duration'].includes(raw)) {
          subcommand = raw;
        } else if (raw === 'ignore' && ['user', 'channel', 'role', 'show'].includes(raw2)) {
          subcommandGroup = 'ignore';
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
        await updateGuild(guild.id, { antilink_enabled: true });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antilink_enabled', type: 'antilink', details: '{}' });
        return reply({ embeds: [successEmbed('Antilink Enabled', '✅ Antilink protection is now **enabled**.')] });
      }

      // ===== DISABLE =====
      if (subcommand === 'disable') {
        await updateGuild(guild.id, { antilink_enabled: false });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antilink_disabled', type: 'antilink', details: '{}' });
        return reply({ embeds: [errorEmbed('Antilink Disabled', '❌ Antilink protection is now **disabled**.')] });
      }

      // ===== STATUS =====
      if (subcommand === 'status') {
        const enabled = guildData.antilink_enabled;
        const alConfig = JSON.parse(guildData.antilink_config || '{}');
        const mode = alConfig.blockInvites && alConfig.blockUrls ? 'both' : alConfig.blockInvites ? 'invites' : alConfig.blockUrls ? 'allurls' : 'invites';
        const embed = infoEmbed('🛡️ Antilink Status', `Status for **${guild.name}**`);
        embed.addFields(
          { name: 'Protection', value: enabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
          { name: 'Mode', value: mode.toUpperCase(), inline: true },
          { name: 'Action', value: (alConfig.action || 'delete').toUpperCase(), inline: true },
          { name: 'Duration', value: `${alConfig.duration || 5} min`, inline: true },
          { name: 'Ignored Users', value: (alConfig.ignore || []).length > 0 ? `${(alConfig.ignore || []).length} users` : 'None', inline: true },
          { name: 'Ignored Channels', value: (alConfig.ignoredChannels || []).length > 0 ? `${(alConfig.ignoredChannels || []).length} channels` : 'None', inline: true },
          { name: 'Whitelisted Domains', value: (alConfig.whitelistedDomains || []).length > 0 ? (alConfig.whitelistedDomains || []).join(', ') : 'None', inline: false }
        );
        return reply({ embeds: [embed] });
      }

      // ===== SETUP =====
      if (subcommand === 'setup') {
        await updateGuild(guild.id, {
          antilink_enabled: true,
          antilink_config: JSON.stringify({
            action: 'delete',
            blockInvites: true,
            blockUrls: true,
            duration: 5
          })
        });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antilink_setup', type: 'antilink', details: '{}' });
        return reply({ embeds: [successEmbed('Antilink Setup Complete', [
          'Protection: Enabled',
          'Mode: Block All Links',
          'Action: Delete',
          'Duration: 5 min',
          '',
          'Use `antilink status` to view your configuration.'
        ].join('\n'))] });
      }

      // ===== ACTION =====
      if (subcommand === 'action') {
        const type = isSlash ? interaction.options.getString('type') : (args?.[1] || 'delete').toLowerCase();
        if (!['delete', 'warn', 'mute', 'kick', 'ban', 'timeout'].includes(type)) {
          return reply({ embeds: [errorEmbed('Error', 'Valid actions: delete, warn, mute, kick, ban, timeout')] });
        }
        let alConfig = JSON.parse(guildData.antilink_config || '{}');
        alConfig.action = type;
        await updateGuild(guild.id, { antilink_config: JSON.stringify(alConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antilink_action_set', type: 'antilink', details: JSON.stringify({ action: type }) });
        return reply({ embeds: [successEmbed('Action Set', `Antilink action set to **${type}**.`)] });
      }

      // ===== MODE =====
      if (subcommand === 'mode') {
        const mode = isSlash ? interaction.options.getString('mode') : (args?.[1] || 'invites').toLowerCase();
        let alConfig = JSON.parse(guildData.antilink_config || '{}');
        if (mode === 'invites') {
          alConfig.blockInvites = true;
          alConfig.blockUrls = false;
        } else if (mode === 'allurls') {
          alConfig.blockInvites = false;
          alConfig.blockUrls = true;
        } else if (mode === 'both') {
          alConfig.blockInvites = true;
          alConfig.blockUrls = true;
        }
        await updateGuild(guild.id, { antilink_config: JSON.stringify(alConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antilink_mode_set', type: 'antilink', details: JSON.stringify({ mode }) });
        return reply({ embeds: [successEmbed('Mode Set', `Antilink blocking mode set to **${mode}**.`)] });
      }

      // ===== WHITELIST DOMAIN =====
      if (subcommand === 'whitelistdomain') {
        const domain = isSlash ? interaction.options.getString('domain') : (args?.[2] || '').toLowerCase();
        const action = isSlash ? interaction.options.getString('action') : (args?.[1] || 'add').toLowerCase();
        if (!domain) return reply({ embeds: [errorEmbed('Error', 'Please provide a valid domain.')] });
        let alConfig = JSON.parse(guildData.antilink_config || '{}');
        let whitelistedDomains = alConfig.whitelistedDomains || [];
        if (action === 'add') {
          if (whitelistedDomains.includes(domain)) return reply({ embeds: [warningEmbed('Warning', 'Domain is already whitelisted.')] });
          whitelistedDomains.push(domain);
        } else {
          whitelistedDomains = whitelistedDomains.filter(d => d !== domain);
        }
        alConfig.whitelistedDomains = whitelistedDomains;
        await updateGuild(guild.id, { antilink_config: JSON.stringify(alConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: `antilink_whitelist_domain_${action}`, type: 'antilink', details: JSON.stringify({ domain }) });
        return reply({ embeds: [successEmbed('Domain Updated', `**${domain}** ${action === 'add' ? 'added to' : 'removed from'} whitelist.`)] });
      }

      // ===== DURATION =====
      if (subcommand === 'duration') {
        const minutes = isSlash ? interaction.options.getInteger('minutes') : parseInt(args?.[1]);
        if (!minutes || isNaN(minutes)) {
          return reply({ embeds: [errorEmbed('Error', 'Please provide a valid duration.')] });
        }
        let alConfig = JSON.parse(guildData.antilink_config || '{}');
        alConfig.duration = minutes;
        await updateGuild(guild.id, { antilink_config: JSON.stringify(alConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antilink_duration_set', type: 'antilink', details: JSON.stringify({ minutes }) });
        return reply({ embeds: [successEmbed('Duration Set', `Mute duration set to **${minutes} minutes**.`)] });
      }

      // ===== IGNORE USER =====
      if (subcommandGroup === 'ignore' && subcommand === 'user') {
        const target = isSlash ? interaction.options.getUser('user') : guild.members.cache.get(args?.[2]?.replace(/[<@!>]/g, ''));
        const action = isSlash ? interaction.options.getString('action') : (args?.[1] || 'add').toLowerCase();
        if (!target) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid user.')] });
        let alConfig = JSON.parse(guildData.antilink_config || '{}');
        let ignore = alConfig.ignore || [];
        if (action === 'add') {
          if (ignore.includes(target.id)) return reply({ embeds: [warningEmbed('Warning', 'User is already ignored.')] });
          ignore.push(target.id);
        } else {
          ignore = ignore.filter(id => id !== target.id);
        }
        alConfig.ignore = ignore;
        await updateGuild(guild.id, { antilink_config: JSON.stringify(alConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: `antilink_ignore_user_${action}`, type: 'antilink', details: JSON.stringify({ target: target.id }) });
        return reply({ embeds: [successEmbed('Ignore Updated', `<@${target.id}> ${action === 'add' ? 'added to' : 'removed from'} ignore list.`)] });
      }

      // ===== IGNORE CHANNEL =====
      if (subcommandGroup === 'ignore' && subcommand === 'channel') {
        const target = isSlash ? interaction.options.getChannel('channel') : guild.channels.cache.get(args?.[2]?.replace(/[<#>]/g, ''));
        const action = isSlash ? interaction.options.getString('action') : (args?.[1] || 'add').toLowerCase();
        if (!target) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid channel.')] });
        let alConfig = JSON.parse(guildData.antilink_config || '{}');
        let ignoredChannels = alConfig.ignoredChannels || [];
        if (action === 'add') {
          if (ignoredChannels.includes(target.id)) return reply({ embeds: [warningEmbed('Warning', 'Channel is already ignored.')] });
          ignoredChannels.push(target.id);
        } else {
          ignoredChannels = ignoredChannels.filter(id => id !== target.id);
        }
        alConfig.ignoredChannels = ignoredChannels;
        await updateGuild(guild.id, { antilink_config: JSON.stringify(alConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: `antilink_ignore_channel_${action}`, type: 'antilink', details: JSON.stringify({ channel: target.id }) });
        return reply({ embeds: [successEmbed('Ignore Updated', `<#${target.id}> ${action === 'add' ? 'added to' : 'removed from'} ignore list.`)] });
      }

      // ===== IGNORE ROLE =====
      if (subcommandGroup === 'ignore' && subcommand === 'role') {
        const target = isSlash ? interaction.options.getRole('role') : guild.roles.cache.get(args?.[2]?.replace(/[<@&>]/g, ''));
        const action = isSlash ? interaction.options.getString('action') : (args?.[1] || 'add').toLowerCase();
        if (!target) return reply({ embeds: [errorEmbed('Error', 'Please specify a valid role.')] });
        let alConfig = JSON.parse(guildData.antilink_config || '{}');
        let ignoredRoles = alConfig.ignoredRoles || [];
        if (action === 'add') {
          if (ignoredRoles.includes(target.id)) return reply({ embeds: [warningEmbed('Warning', 'Role is already ignored.')] });
          ignoredRoles.push(target.id);
        } else {
          ignoredRoles = ignoredRoles.filter(id => id !== target.id);
        }
        alConfig.ignoredRoles = ignoredRoles;
        await updateGuild(guild.id, { antilink_config: JSON.stringify(alConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: `antilink_ignore_role_${action}`, type: 'antilink', details: JSON.stringify({ role: target.id }) });
        return reply({ embeds: [successEmbed('Ignore Updated', `<@&${target.id}> ${action === 'add' ? 'added to' : 'removed from'} ignore list.`)] });
      }

      // ===== IGNORE SHOW =====
      if (subcommandGroup === 'ignore' && subcommand === 'show') {
        let alConfig = JSON.parse(guildData.antilink_config || '{}');
        const ignoredUsers = (alConfig.ignore || []).map(id => `<@${id}>`).join(', ') || 'None';
        const ignoredChannels = (alConfig.ignoredChannels || []).map(id => `<#${id}>`).join(', ') || 'None';
        const ignoredRoles = (alConfig.ignoredRoles || []).map(id => `<@&${id}>`).join(', ') || 'None';
        return reply({ embeds: [infoEmbed('Antilink Ignore List', [
          `**Users:** ${ignoredUsers}`,
          `**Channels:** ${ignoredChannels}`,
          `**Roles:** ${ignoredRoles}`
        ].join('\n'))] });
      }

    } catch (error) {
      console.error(error);
      return reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
    }
  }
};
