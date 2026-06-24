const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');

const COLORS = {
  success: 0x00ff00,
  error: 0xff0000,
  warning: 0xffa500,
  info: 0x2f3136
};

async function ensureTable() {
  const db = getDB();
  const exists = await db.schema.hasTable('autorole_config');
  if (!exists) {
    await db.schema.createTable('autorole_config', (table) => {
      table.string('guild_id').primary();
      table.json('bots_roles').defaultTo('[]');
      table.json('humans_roles').defaultTo('[]');
      table.boolean('enabled').defaultTo(true);
    });
  }
}

async function getConfig(guildId) {
  await ensureTable();
  const db = getDB();
  let config = await db('autorole_config').where({ guild_id: guildId }).first();
  if (!config) {
    await db('autorole_config').insert({ guild_id: guildId, bots_roles: '[]', humans_roles: '[]', enabled: true });
    config = await db('autorole_config').where({ guild_id: guildId }).first();
  }
  return {
    guild_id: config.guild_id,
    bots_roles: JSON.parse(config.bots_roles || '[]'),
    humans_roles: JSON.parse(config.humans_roles || '[]'),
    enabled: config.enabled
  };
}

async function saveConfig(guildId, cfg) {
  await ensureTable();
  const db = getDB();
  const existing = await db('autorole_config').where({ guild_id: guildId }).first();
  const data = {
    bots_roles: JSON.stringify(cfg.bots_roles),
    humans_roles: JSON.stringify(cfg.humans_roles),
    enabled: cfg.enabled
  };
  if (existing) {
    await db('autorole_config').where({ guild_id: guildId }).update(data);
  } else {
    await db('autorole_config').insert({ guild_id: guildId, ...data });
  }
}

function buildEmbed(color, title, description, fields) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
  if (fields) embed.addFields(fields);
  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Automatic role assignment system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add role for all users')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to add').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove role from all users')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('Show current autorole configuration')
    )
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Enable or disable autorole')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true))
    )

    .addSubcommandGroup(group =>
      group.setName('bots')
        .setDescription('Manage autorole for bots')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Add role for bots')
            .addRoleOption(opt => opt.setName('role').setDescription('Role to add').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove role for bots')
            .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true))
        )
    )

    .addSubcommandGroup(group =>
      group.setName('humans')
        .setDescription('Manage autorole for humans')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Add role for humans')
            .addRoleOption(opt => opt.setName('role').setDescription('Role to add').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove role for humans')
            .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true))
        )
    )

    .addSubcommandGroup(group =>
      group.setName('reset')
        .setDescription('Reset autorole configuration')
        .addSubcommand(sub =>
          sub.setName('all')
            .setDescription('Reset all autorole roles')
        )
        .addSubcommand(sub =>
          sub.setName('bots')
            .setDescription('Reset bot autorole roles')
        )
        .addSubcommand(sub =>
          sub.setName('humans')
            .setDescription('Reset human autorole roles')
        )
    )

    .addSubcommand(sub =>
      sub.setName('config')
        .setDescription('View current autorole configuration')
    ),

  cooldown: 5,
  aliases: ['arole', 'ar'],
  prefix: true,

  async execute(interaction, args) {
    try {
      await ensureTable();

      const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
      const guild = interaction.guild;
      if (!guild) {
        return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Error', 'This command can only be used in a server.')] });
      }

      const guildConfig = await getConfig(guild.id);
      const botMember = guild.members.me;
      const highestBotRole = botMember.roles.highest;

      if (isSlash) {
        return handleSlash(interaction, guild, guildConfig, botMember, highestBotRole);
      } else {
        return handlePrefix(interaction, args, guild, guildConfig, botMember, highestBotRole);
      }
    } catch (err) {
      console.error('Autorole error:', err);
      const reply = { embeds: [buildEmbed(COLORS.error, 'Error', 'An error occurred while executing the autorole command.')] };
      if (interaction.replied || interaction.deferred) {
        return interaction.followUp(reply).catch(() => {});
      }
      return interaction.reply(reply).catch(() => {});
    }
  }
};

async function handleSlash(interaction, guild, guildConfig, botMember, highestBotRole) {
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();

  if (group === 'bots') {
    const role = interaction.options.getRole('role');
    if (!role) return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Error', 'Please provide a valid role.')] });
    if (role.position >= highestBotRole.position) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Role Hierarchy', `I cannot assign a role equal to or higher than my highest role (${highestBotRole}).`)] });
    }
    if (role.id === guild.id) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Invalid Role', 'Cannot assign the @everyone role.')] });
    }

    if (sub === 'add') {
      if (guildConfig.bots_roles.includes(role.id)) {
        return interaction.reply({ embeds: [buildEmbed(COLORS.warning, 'Already Added', `Role <@&${role.id}> is already in the bots autorole list.`)] });
      }
      guildConfig.bots_roles.push(role.id);
      await saveConfig(guild.id, guildConfig);
      return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Bots Role Added', `Role <@&${role.id}> will now be automatically assigned to bots joining the server.`)] });
    }

    if (sub === 'remove') {
      if (!guildConfig.bots_roles.includes(role.id)) {
        return interaction.reply({ embeds: [buildEmbed(COLORS.warning, 'Not Found', `Role <@&${role.id}> is not in the bots autorole list.`)] });
      }
      guildConfig.bots_roles = guildConfig.bots_roles.filter((r) => r !== role.id);
      await saveConfig(guild.id, guildConfig);
      return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Bots Role Removed', `Role <@&${role.id}> will no longer be assigned to bots.`)] });
    }
  }

  if (group === 'humans') {
    const role = interaction.options.getRole('role');
    if (!role) return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Error', 'Please provide a valid role.')] });
    if (role.position >= highestBotRole.position) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Role Hierarchy', `I cannot assign a role equal to or higher than my highest role (${highestBotRole}).`)] });
    }
    if (role.id === guild.id) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Invalid Role', 'Cannot assign the @everyone role.')] });
    }

    if (sub === 'add') {
      if (guildConfig.humans_roles.includes(role.id)) {
        return interaction.reply({ embeds: [buildEmbed(COLORS.warning, 'Already Added', `Role <@&${role.id}> is already in the humans autorole list.`)] });
      }
      guildConfig.humans_roles.push(role.id);
      await saveConfig(guild.id, guildConfig);
      return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Humans Role Added', `Role <@&${role.id}> will now be automatically assigned to humans joining the server.`)] });
    }

    if (sub === 'remove') {
      if (!guildConfig.humans_roles.includes(role.id)) {
        return interaction.reply({ embeds: [buildEmbed(COLORS.warning, 'Not Found', `Role <@&${role.id}> is not in the humans autorole list.`)] });
      }
      guildConfig.humans_roles = guildConfig.humans_roles.filter((r) => r !== role.id);
      await saveConfig(guild.id, guildConfig);
      return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Humans Role Removed', `Role <@&${role.id}> will no longer be assigned to humans.`)] });
    }
  }

  if (group === 'reset') {
    if (sub === 'all') {
      guildConfig.bots_roles = [];
      guildConfig.humans_roles = [];
      await saveConfig(guild.id, guildConfig);
      return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Autorole Reset', 'All autorole configuration has been cleared.')] });
    }
    if (sub === 'bots') {
      guildConfig.bots_roles = [];
      await saveConfig(guild.id, guildConfig);
      return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Bots Roles Reset', 'All bot autorole roles have been cleared.')] });
    }
    if (sub === 'humans') {
      guildConfig.humans_roles = [];
      await saveConfig(guild.id, guildConfig);
      return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Humans Roles Reset', 'All human autorole roles have been cleared.')] });
    }
  }

  if (sub === 'add') {
    const role = interaction.options.getRole('role');
    if (!role) return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Error', 'Please provide a valid role.')] });
    if (role.position >= highestBotRole.position) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Role Hierarchy', `I cannot assign a role equal to or higher than my highest role (${highestBotRole}).`)] });
    }
    if (role.id === guild.id) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Invalid Role', 'Cannot assign the @everyone role.')] });
    }

    const alreadyBots = guildConfig.bots_roles.includes(role.id);
    const alreadyHumans = guildConfig.humans_roles.includes(role.id);
    if (alreadyBots && alreadyHumans) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.warning, 'Already Added', `Role <@&${role.id}> is already in both bots and humans autorole lists.`)] });
    }

    if (!alreadyBots) guildConfig.bots_roles.push(role.id);
    if (!alreadyHumans) guildConfig.humans_roles.push(role.id);
    await saveConfig(guild.id, guildConfig);
    return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Role Added', `Role <@&${role.id}> will now be automatically assigned to all users (bots and humans) joining the server.`)] });
  }

  if (sub === 'remove') {
    const role = interaction.options.getRole('role');
    if (!role) return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Error', 'Please provide a valid role.')] });

    const inBots = guildConfig.bots_roles.includes(role.id);
    const inHumans = guildConfig.humans_roles.includes(role.id);
    if (!inBots && !inHumans) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.warning, 'Not Found', `Role <@&${role.id}> is not in any autorole list.`)] });
    }

    guildConfig.bots_roles = guildConfig.bots_roles.filter((r) => r !== role.id);
    guildConfig.humans_roles = guildConfig.humans_roles.filter((r) => r !== role.id);
    await saveConfig(guild.id, guildConfig);
    return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Role Removed', `Role <@&${role.id}> has been removed from all autorole lists.`)] });
  }

  if (sub === 'show' || sub === 'config') {
    return sendConfigEmbed(interaction, guildConfig);
  }

  if (sub === 'toggle') {
    const enabled = interaction.options.getBoolean('enabled');
    guildConfig.enabled = enabled;
    await saveConfig(guild.id, guildConfig);
    return interaction.reply({
      embeds: [buildEmbed(
        enabled ? COLORS.success : COLORS.warning,
        'Autorole Toggled',
        `Autorole is now **${enabled ? 'enabled' : 'disabled'}**.`
      )]
    });
  }
}

async function handlePrefix(interaction, args, guild, guildConfig, botMember, highestBotRole) {
  const sub = (args[0] || '').toLowerCase();
  const group = (args[1] || '').toLowerCase();
  const target = (args[2] || '').toLowerCase();
  const roleId = args[3];

  if (!sub) {
    return sendConfigEmbed(interaction, guildConfig);
  }

  if (sub === 'add') {
    const role = await resolveRole(interaction, args[1]);
    if (!role) return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Error', 'Please provide a valid role ID or mention.')] });
    if (role.position >= highestBotRole.position) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Role Hierarchy', `I cannot assign a role equal to or higher than my highest role (${highestBotRole}).`)] });
    }
    if (role.id === guild.id) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Invalid Role', 'Cannot assign the @everyone role.')] });
    }

    const alreadyBots = guildConfig.bots_roles.includes(role.id);
    const alreadyHumans = guildConfig.humans_roles.includes(role.id);
    if (alreadyBots && alreadyHumans) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.warning, 'Already Added', `Role <@&${role.id}> is already in both bots and humans autorole lists.`)] });
    }

    if (!alreadyBots) guildConfig.bots_roles.push(role.id);
    if (!alreadyHumans) guildConfig.humans_roles.push(role.id);
    await saveConfig(guild.id, guildConfig);
    return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Role Added', `Role <@&${role.id}> will now be automatically assigned to all users (bots and humans) joining the server.`)] });
  }

  if (sub === 'remove') {
    const role = await resolveRole(interaction, args[1]);
    if (!role) return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Error', 'Please provide a valid role ID or mention.')] });

    const inBots = guildConfig.bots_roles.includes(role.id);
    const inHumans = guildConfig.humans_roles.includes(role.id);
    if (!inBots && !inHumans) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.warning, 'Not Found', `Role <@&${role.id}> is not in any autorole list.`)] });
    }

    guildConfig.bots_roles = guildConfig.bots_roles.filter((r) => r !== role.id);
    guildConfig.humans_roles = guildConfig.humans_roles.filter((r) => r !== role.id);
    await saveConfig(guild.id, guildConfig);
    return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Role Removed', `Role <@&${role.id}> has been removed from all autorole lists.`)] });
  }

  if (sub === 'show' || sub === 'config') {
    return sendConfigEmbed(interaction, guildConfig);
  }

  if (sub === 'toggle') {
    const value = (args[1] || '').toLowerCase();
    if (value !== 'true' && value !== 'false' && value !== 'on' && value !== 'off') {
      return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Error', 'Please provide `true`, `false`, `on`, or `off`.')] });
    }
    guildConfig.enabled = value === 'true' || value === 'on';
    await saveConfig(guild.id, guildConfig);
    return interaction.reply({
      embeds: [buildEmbed(
        guildConfig.enabled ? COLORS.success : COLORS.warning,
        'Autorole Toggled',
        `Autorole is now **${guildConfig.enabled ? 'enabled' : 'disabled'}**.`
      )]
    });
  }

  if (sub === 'bots') {
    if (!group || (group !== 'add' && group !== 'remove')) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Error', 'Usage: `!autorole bots <add|remove> <role>`')] });
    }
    const role = await resolveRole(interaction, target);
    if (!role) return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Error', 'Please provide a valid role ID or mention.')] });
    if (role.position >= highestBotRole.position) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Role Hierarchy', `I cannot assign a role equal to or higher than my highest role (${highestBotRole}).`)] });
    }
    if (role.id === guild.id) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Invalid Role', 'Cannot assign the @everyone role.')] });
    }

    if (group === 'add') {
      if (guildConfig.bots_roles.includes(role.id)) {
        return interaction.reply({ embeds: [buildEmbed(COLORS.warning, 'Already Added', `Role <@&${role.id}> is already in the bots autorole list.`)] });
      }
      guildConfig.bots_roles.push(role.id);
      await saveConfig(guild.id, guildConfig);
      return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Bots Role Added', `Role <@&${role.id}> will now be automatically assigned to bots joining the server.`)] });
    }

    if (group === 'remove') {
      if (!guildConfig.bots_roles.includes(role.id)) {
        return interaction.reply({ embeds: [buildEmbed(COLORS.warning, 'Not Found', `Role <@&${role.id}> is not in the bots autorole list.`)] });
      }
      guildConfig.bots_roles = guildConfig.bots_roles.filter((r) => r !== role.id);
      await saveConfig(guild.id, guildConfig);
      return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Bots Role Removed', `Role <@&${role.id}> will no longer be assigned to bots.`)] });
    }
  }

  if (sub === 'humans') {
    if (!group || (group !== 'add' && group !== 'remove')) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Error', 'Usage: `!autorole humans <add|remove> <role>`')] });
    }
    const role = await resolveRole(interaction, target);
    if (!role) return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Error', 'Please provide a valid role ID or mention.')] });
    if (role.position >= highestBotRole.position) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Role Hierarchy', `I cannot assign a role equal to or higher than my highest role (${highestBotRole}).`)] });
    }
    if (role.id === guild.id) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Invalid Role', 'Cannot assign the @everyone role.')] });
    }

    if (group === 'add') {
      if (guildConfig.humans_roles.includes(role.id)) {
        return interaction.reply({ embeds: [buildEmbed(COLORS.warning, 'Already Added', `Role <@&${role.id}> is already in the humans autorole list.`)] });
      }
      guildConfig.humans_roles.push(role.id);
      await saveConfig(guild.id, guildConfig);
      return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Humans Role Added', `Role <@&${role.id}> will now be automatically assigned to humans joining the server.`)] });
    }

    if (group === 'remove') {
      if (!guildConfig.humans_roles.includes(role.id)) {
        return interaction.reply({ embeds: [buildEmbed(COLORS.warning, 'Not Found', `Role <@&${role.id}> is not in the humans autorole list.`)] });
      }
      guildConfig.humans_roles = guildConfig.humans_roles.filter((r) => r !== role.id);
      await saveConfig(guild.id, guildConfig);
      return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Humans Role Removed', `Role <@&${role.id}> will no longer be assigned to humans.`)] });
    }
  }

  if (sub === 'reset') {
    if (!group || (group !== 'all' && group !== 'bots' && group !== 'humans')) {
      return interaction.reply({ embeds: [buildEmbed(COLORS.error, 'Error', 'Usage: `!autorole reset <all|bots|humans>`')] });
    }

    if (group === 'all') {
      guildConfig.bots_roles = [];
      guildConfig.humans_roles = [];
      await saveConfig(guild.id, guildConfig);
      return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Autorole Reset', 'All autorole configuration has been cleared.')] });
    }
    if (group === 'bots') {
      guildConfig.bots_roles = [];
      await saveConfig(guild.id, guildConfig);
      return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Bots Roles Reset', 'All bot autorole roles have been cleared.')] });
    }
    if (group === 'humans') {
      guildConfig.humans_roles = [];
      await saveConfig(guild.id, guildConfig);
      return interaction.reply({ embeds: [buildEmbed(COLORS.success, 'Humans Roles Reset', 'All human autorole roles have been cleared.')] });
    }
  }

  return sendConfigEmbed(interaction, guildConfig);
}

async function resolveRole(interaction, input) {
  if (!input) return null;
  const mentionMatch = input.match(/^<@&(\d+)>$/);
  if (mentionMatch) {
    return interaction.guild.roles.cache.get(mentionMatch[1]) || null;
  }
  if (/^\d+$/.test(input)) {
    return interaction.guild.roles.cache.get(input) || null;
  }
  const nameMatch = interaction.guild.roles.cache.find((r) => r.name.toLowerCase() === input.toLowerCase());
  return nameMatch || null;
}

function sendConfigEmbed(interaction, guildConfig) {
  const botsRoles = guildConfig.bots_roles.length > 0
    ? guildConfig.bots_roles.map((id) => `<@&${id}>`).join(', ')
    : 'None';
  const humansRoles = guildConfig.humans_roles.length > 0
    ? guildConfig.humans_roles.map((id) => `<@&${id}>`).join(', ')
    : 'None';

  const embed = buildEmbed(COLORS.info, 'Autorole Configuration', 'Current autorole settings for this server.', [
    { name: 'Status', value: guildConfig.enabled ? '`Enabled`' : '`Disabled`', inline: true },
    { name: 'Bots Roles', value: botsRoles, inline: false },
    { name: 'Humans Roles', value: humansRoles, inline: false }
  ]);

  return interaction.reply({ embeds: [embed] });
}
