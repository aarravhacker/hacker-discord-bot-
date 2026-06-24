const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');

const PUNISHMENT_TYPES = [
  { name: 'Ban', value: 'ban' },
  { name: 'Kick', value: 'kick' },
  { name: 'Mute', value: 'mute' },
  { name: 'Warn', value: 'warn' }
];

const TOGGLE_OPTIONS = [
  { name: 'Enable', value: 'enable' },
  { name: 'Disable', value: 'disable' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automodunified')
    .setDescription('Unified automoderation configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('antiinvites')
        .setDescription('Toggle anti-invite filter')
        .addStringOption(opt =>
          opt.setName('toggle').setDescription('Enable or disable').setRequired(true).addChoices(...TOGGLE_OPTIONS)
        )
    )
    .addSubcommand(sub =>
      sub.setName('antilink')
        .setDescription('Toggle anti-link filter')
        .addStringOption(opt =>
          opt.setName('toggle').setDescription('Enable or disable').setRequired(true).addChoices(...TOGGLE_OPTIONS)
        )
    )
    .addSubcommand(sub =>
      sub.setName('antispam')
        .setDescription('Toggle anti-spam filter')
        .addStringOption(opt =>
          opt.setName('toggle').setDescription('Enable or disable').setRequired(true).addChoices(...TOGGLE_OPTIONS)
        )
    )
    .addSubcommand(sub =>
      sub.setName('config')
        .setDescription('View all automod configuration')
    )
    .addSubcommand(sub =>
      sub.setName('logging')
        .setDescription('Toggle automod logging')
        .addStringOption(opt =>
          opt.setName('toggle').setDescription('Enable or disable').setRequired(true).addChoices(...TOGGLE_OPTIONS)
        )
    )
    .addSubcommand(sub =>
      sub.setName('punishment')
        .setDescription('Set the default punishment type')
        .addStringOption(opt =>
          opt.setName('type').setDescription('Punishment type').setRequired(true).addChoices(...PUNISHMENT_TYPES)
        )
    )
    .addSubcommand(sub =>
      sub.setName('rules')
        .setDescription('Toggle automod rules enforcement')
        .addStringOption(opt =>
          opt.setName('toggle').setDescription('Enable or disable').setRequired(true).addChoices(...TOGGLE_OPTIONS)
        )
    )
    .addSubcommandGroup(group =>
      group.setName('ignore')
        .setDescription('Manage ignored channels')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Add a channel to ignore')
            .addChannelOption(opt =>
              opt.setName('channel').setDescription('Channel to ignore').setRequired(true).addChannelTypes(ChannelType.GuildText)
            )
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a channel from ignore list')
            .addChannelOption(opt =>
              opt.setName('channel').setDescription('Channel to unignore').setRequired(true).addChannelTypes(ChannelType.GuildText)
            )
        )
        .addSubcommand(sub =>
          sub.setName('show')
            .setDescription('Show all ignored channels')
        )
    )
    .addSubcommandGroup(group =>
      group.setName('whitelist')
        .setDescription('Manage whitelisted roles and users')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Add a role to whitelist')
            .addRoleOption(opt =>
              opt.setName('role').setDescription('Role to whitelist').setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a role from whitelist')
            .addRoleOption(opt =>
              opt.setName('role').setDescription('Role to remove').setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub.setName('reset')
            .setDescription('Clear the entire whitelist')
        )
        .addSubcommand(sub =>
          sub.setName('role')
            .setDescription('Set the bypass role')
            .addRoleOption(opt =>
              opt.setName('role').setDescription('Role that bypasses automod').setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub.setName('roleremove')
            .setDescription('Remove the bypass role')
        )
        .addSubcommand(sub =>
          sub.setName('show')
            .setDescription('Show whitelisted roles')
        )
    ),
  cooldown: 3,
  aliases: ['au', 'unifiedautomod', 'amodcfg'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guildId = interaction.guild.id;
    interaction.args = args;

    if (isSlash) {
      const group = interaction.options.getSubcommandGroup(false);
      const sub = interaction.options.getSubcommand();
      if (group) return handleGroupCommand(interaction, guildId, group, sub, isSlash);
      return handleSubcommand(interaction, guildId, sub, isSlash);
    }

    const firstArg = args?.[0];
    const secondArg = args?.[1];
    const thirdArg = args?.[2];

    const simpleSubs = ['antiinvites', 'antilink', 'antispam', 'config', 'logging', 'punishment', 'rules'];
    const groups = { ignore: ['add', 'remove', 'show'], whitelist: ['add', 'remove', 'reset', 'role', 'roleremove', 'show'] };

    if (simpleSubs.includes(firstArg)) {
      return handleSubcommand(interaction, guildId, firstArg, isSlash);
    }

    if (groups[firstArg] && groups[firstArg].includes(secondArg)) {
      return handleGroupCommand(interaction, guildId, firstArg, secondArg, isSlash);
    }

    return interaction.reply({
      embeds: [errorEmbed('Invalid Usage', 'Use `automodunified <subcommand>` or `automodunified <group> <subcommand>`')]
    });
  }
};

async function getGuildConfig(db, guildId) {
  await db.schema.hasTable('automod_config').then(exists => {
    if (!exists) {
      return db.schema.createTable('automod_config', table => {
        table.string('guild_id').primary();
        table.boolean('antiinvites').defaultTo(false);
        table.boolean('antilink').defaultTo(false);
        table.boolean('antispam').defaultTo(false);
        table.boolean('logging').defaultTo(false);
        table.boolean('rules').defaultTo(false);
        table.string('punishment').defaultTo('warn');
        table.json('ignore_channels').defaultTo('[]');
        table.json('whitelist_roles').defaultTo('[]');
        table.string('bypass_role');
      });
    }
  });

  let config = await db('automod_config').where({ guild_id: guildId }).first();
  if (!config) {
    await db('automod_config').insert({
      guild_id: guildId,
      antiinvites: false,
      antilink: false,
      antispam: false,
      logging: false,
      rules: false,
      punishment: 'warn',
      ignore_channels: '[]',
      whitelist_roles: '[]',
      bypass_role: null
    });
    config = await db('automod_config').where({ guild_id: guildId }).first();
  }

  return config;
}

function parseJsonArray(val) {
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

async function handleSubcommand(interaction, guildId, sub, isSlash) {
  try {
    const db = getDB();
    const config = await getGuildConfig(db, guildId);

    if (sub === 'config') {
      const ignoreChannels = parseJsonArray(config.ignore_channels);
      const whitelistRoles = parseJsonArray(config.whitelist_roles);

      const embed = new EmbedBuilder()
        .setTitle('Automod Configuration')
        .setColor(embedColors.info)
        .addFields(
          { name: 'Anti-Invites', value: config.antiinvites ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Anti-Link', value: config.antilink ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Anti-Spam', value: config.antispam ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Logging', value: config.logging ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Rules', value: config.rules ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Punishment', value: config.punishment || 'warn', inline: true },
          { name: 'Ignored Channels', value: ignoreChannels.length > 0 ? ignoreChannels.map(id => `<#${id}>`).join(', ') : 'None', inline: false },
          { name: 'Whitelist Roles', value: whitelistRoles.length > 0 ? whitelistRoles.map(id => `<@&${id}>`).join(', ') : 'None', inline: false },
          { name: 'Bypass Role', value: config.bypass_role ? `<@&${config.bypass_role}>` : 'Not set', inline: true }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'punishment') {
      const type = isSlash
        ? interaction.options.getString('type')
        : args?.[1];

      if (!type || !PUNISHMENT_TYPES.find(p => p.value === type)) {
        return interaction.reply({ embeds: [errorEmbed('Please specify a valid punishment type: ban, kick, mute, warn')] });
      }

      await db('automod_config').where({ guild_id: guildId }).update({ punishment: type });

      const embed = new EmbedBuilder()
        .setTitle('Punishment Updated')
        .setDescription(`Default punishment set to **${type}**.`)
        .setColor(embedColors.success)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    const toggleField = sub;
    const toggle = isSlash
      ? interaction.options.getString('toggle')
      : args?.[1];

    if (!toggle || !TOGGLE_OPTIONS.find(t => t.value === toggle)) {
      return interaction.reply({ embeds: [errorEmbed('Please specify `enable` or `disable`.')] });
    }

    const enabled = toggle === 'enable';
    await db('automod_config').where({ guild_id: guildId }).update({ [toggleField]: enabled });

    const embed = new EmbedBuilder()
      .setTitle(`${sub.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())} ${enabled ? 'Enabled' : 'Disabled'}`)
      .setDescription(`${sub.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())} has been **${enabled ? 'enabled' : 'disabled'}**.`)
      .setColor(enabled ? embedColors.success : embedColors.warning)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [errorEmbed('Failed to update automod configuration.')] });
  }
}

async function handleGroupCommand(interaction, guildId, group, sub, isSlash) {
  if (group === 'ignore') return handleIgnore(interaction, guildId, sub, isSlash);
  if (group === 'whitelist') return handleWhitelist(interaction, guildId, sub, isSlash);
}

async function handleIgnore(interaction, guildId, sub, isSlash) {
  try {
    const db = getDB();
    const config = await getGuildConfig(db, guildId);
    let channels = parseJsonArray(config.ignore_channels);

    if (sub === 'show') {
      if (channels.length === 0) {
        return interaction.reply({ embeds: [infoEmbed('No channels are ignored.')] });
      }

      const list = channels.map((id, i) => `\`${i + 1}\`. <#${id}>`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle('Ignored Channels')
        .setDescription(list)
        .setColor(embedColors.info)
        .setFooter({ text: `Total: ${channels.length} channel(s)` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    const channel = isSlash
      ? interaction.options.getChannel('channel')
      : interaction.guild.channels.cache.get(args?.[2]?.replace(/[<#>]/g, ''));

    if (!channel) {
      return interaction.reply({ embeds: [errorEmbed('Please specify a valid channel.')] });
    }

    if (sub === 'add') {
      if (channels.includes(channel.id)) {
        return interaction.reply({ embeds: [warningEmbed(`${channel} is already ignored.`)] });
      }
      channels.push(channel.id);
      await db('automod_config').where({ guild_id: guildId }).update({ ignore_channels: JSON.stringify(channels) });

      const embed = new EmbedBuilder()
        .setTitle('Channel Ignored')
        .setDescription(`${channel} will now be ignored by automod.`)
        .setColor(embedColors.success)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'remove') {
      if (!channels.includes(channel.id)) {
        return interaction.reply({ embeds: [errorEmbed(`${channel} is not in the ignore list.`)] });
      }
      channels = channels.filter(id => id !== channel.id);
      await db('automod_config').where({ guild_id: guildId }).update({ ignore_channels: JSON.stringify(channels) });

      const embed = new EmbedBuilder()
        .setTitle('Channel Unignored')
        .setDescription(`${channel} will now be moderated by automod.`)
        .setColor(embedColors.success)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [errorEmbed('Failed to update ignore list.')] });
  }
}

async function handleWhitelist(interaction, guildId, sub, isSlash) {
  try {
    const db = getDB();
    const config = await getGuildConfig(db, guildId);
    let roles = parseJsonArray(config.whitelist_roles);

    if (sub === 'show') {
      if (roles.length === 0) {
        return interaction.reply({ embeds: [infoEmbed('No roles are whitelisted.')] });
      }

      const list = roles.map((id, i) => `\`${i + 1}\`. <@&${id}>`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle('Whitelisted Roles')
        .setDescription(list)
        .setColor(embedColors.info)
        .addFields({ name: 'Bypass Role', value: config.bypass_role ? `<@&${config.bypass_role}>` : 'Not set', inline: true })
        .setFooter({ text: `Total: ${roles.length} role(s)` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'reset') {
      await db('automod_config').where({ guild_id: guildId }).update({ whitelist_roles: '[]' });

      const embed = new EmbedBuilder()
        .setTitle('Whitelist Reset')
        .setDescription('All whitelisted roles have been cleared.')
        .setColor(embedColors.success)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'role') {
      const role = isSlash
        ? interaction.options.getRole('role')
        : interaction.guild.roles.cache.get(args?.[2]?.replace(/[<@&>]/g, ''));

      if (!role) {
        return interaction.reply({ embeds: [errorEmbed('Please specify a valid role.')] });
      }

      await db('automod_config').where({ guild_id: guildId }).update({ bypass_role: role.id });

      const embed = new EmbedBuilder()
        .setTitle('Bypass Role Set')
        .setDescription(`${role} will now bypass all automod rules.`)
        .setColor(embedColors.success)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'roleremove') {
      await db('automod_config').where({ guild_id: guildId }).update({ bypass_role: null });

      const embed = new EmbedBuilder()
        .setTitle('Bypass Role Removed')
        .setDescription('No role will bypass automod rules.')
        .setColor(embedColors.success)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    const role = isSlash
      ? interaction.options.getRole('role')
      : interaction.guild.roles.cache.get(args?.[2]?.replace(/[<@&>]/g, ''));

    if (!role) {
      return interaction.reply({ embeds: [errorEmbed('Please specify a valid role.')] });
    }

    if (sub === 'add') {
      if (roles.includes(role.id)) {
        return interaction.reply({ embeds: [warningEmbed(`${role} is already whitelisted.`)] });
      }
      roles.push(role.id);
      await db('automod_config').where({ guild_id: guildId }).update({ whitelist_roles: JSON.stringify(roles) });

      const embed = new EmbedBuilder()
        .setTitle('Role Whitelisted')
        .setDescription(`${role} will now be exempt from automod.`)
        .setColor(embedColors.success)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'remove') {
      if (!roles.includes(role.id)) {
        return interaction.reply({ embeds: [errorEmbed(`${role} is not whitelisted.`)] });
      }
      roles = roles.filter(id => id !== role.id);
      await db('automod_config').where({ guild_id: guildId }).update({ whitelist_roles: JSON.stringify(roles) });

      const embed = new EmbedBuilder()
        .setTitle('Role Removed from Whitelist')
        .setDescription(`${role} will now be subject to automod.`)
        .setColor(embedColors.success)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [errorEmbed('Failed to update whitelist.')] });
  }
}
