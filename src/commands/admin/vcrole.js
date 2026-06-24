const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vcrole')
    .setDescription('Auto-assign roles when users join voice channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommandGroup(group =>
      group.setName('bots')
        .setDescription('Manage bot roles for voice channels')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Add a role for bots in voice')
            .addRoleOption(opt =>
              opt.setName('role').setDescription('Role to assign to bots').setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a bot role')
            .addRoleOption(opt =>
              opt.setName('role').setDescription('Role to remove').setRequired(true)
            )
        )
    )
    .addSubcommandGroup(group =>
      group.setName('humans')
        .setDescription('Manage human roles for voice channels')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Add a role for humans in voice')
            .addRoleOption(opt =>
              opt.setName('role').setDescription('Role to assign to humans').setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a human role')
            .addRoleOption(opt =>
              opt.setName('role').setDescription('Role to remove').setRequired(true)
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('config')
        .setDescription('View current VC role configuration')
    )
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset all VC role settings')
    ),
  cooldown: 3,
  aliases: ['vcroles', 'voiceroles', 'vcrl'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guildId = interaction.guild.id;
    interaction.args = args;

    if (isSlash) {
      const group = interaction.options.getSubcommandGroup(false);
      const sub = interaction.options.getSubcommand();
      return handleCommand(interaction, guildId, group, sub, isSlash);
    }

    const group = args?.[0];
    const sub = args?.[1];
    const validGroups = ['bots', 'humans'];
    const validSubs = ['add', 'remove'];

    if (group === 'config' || group === 'reset') {
      return handleCommand(interaction, guildId, null, group, isSlash);
    }

    if (!group || !validGroups.includes(group)) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Usage', 'Usage: `vcrole <bots|humans> <add|remove>` or `vcrole <config|reset>`')]
      });
    }
    if (!sub || !validSubs.includes(sub)) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Subcommand', 'Usage: `vcrole ' + group + ' <add|remove>`')]
      });
    }

    return handleCommand(interaction, guildId, group, sub, isSlash);
  }
};

async function handleCommand(interaction, guildId, group, sub, isSlash) {
  if (group === 'bots') {
    switch (sub) {
      case 'add': return handleRoleAdd(interaction, guildId, 'bots_role', isSlash);
      case 'remove': return handleRoleRemove(interaction, guildId, 'bots_role', isSlash);
    }
  } else if (group === 'humans') {
    switch (sub) {
      case 'add': return handleRoleAdd(interaction, guildId, 'humans_role', isSlash);
      case 'remove': return handleRoleRemove(interaction, guildId, 'humans_role', isSlash);
    }
  } else if (sub === 'config') {
    return handleConfig(interaction, guildId);
  } else if (sub === 'reset') {
    return handleReset(interaction, guildId);
  }
}

async function ensureTable(db) {
  const exists = await db.schema.hasTable('vcrole_config');
  if (!exists) {
    await db.schema.createTable('vcrole_config', table => {
      table.string('guild_id').primary();
      table.string('bots_role');
      table.string('humans_role');
    });
  }
}

async function handleRoleAdd(interaction, guildId, column, isSlash) {
  try {
    const role = isSlash
      ? interaction.options.getRole('role')
      : interaction.guild.roles.cache.get(args?.[2]?.replace(/[<@&>]/g, ''));

    if (!role) {
      return interaction.reply({ embeds: [errorEmbed('Please specify a valid role.')] });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ embeds: [errorEmbed('Cannot assign a role equal to or higher than my highest role.')] });
    }

    const db = getDB();
    await ensureTable(db);

    const existing = await db('vcrole_config').where({ guild_id: guildId }).first();

    if (existing) {
      const currentVal = existing[column];
      if (currentVal === role.id) {
        return interaction.reply({ embeds: [warningEmbed(`That role is already set for ${column === 'bots_role' ? 'bots' : 'humans'}.`)] });
      }

      await db('vcrole_config').where({ guild_id: guildId }).update({ [column]: role.id });
    } else {
      const insertData = { guild_id: guildId };
      insertData[column] = role.id;
      await db('vcrole_config').insert(insertData);
    }

    const label = column === 'bots_role' ? 'bots' : 'humans';
    const embed = new EmbedBuilder()
      .setTitle('VC Role Updated')
      .setDescription(`Role ${role} will be auto-assigned to ${label} when they join a voice channel.`)
      .setColor(embedColors.success)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [errorEmbed('Failed to set VC role.')] });
  }
}

async function handleRoleRemove(interaction, guildId, column, isSlash) {
  try {
    const role = isSlash
      ? interaction.options.getRole('role')
      : interaction.guild.roles.cache.get(args?.[2]?.replace(/[<@&>]/g, ''));

    if (!role) {
      return interaction.reply({ embeds: [errorEmbed('Please specify a valid role.')] });
    }

    const db = getDB();
    await ensureTable(db);

    const existing = await db('vcrole_config').where({ guild_id: guildId }).first();
    if (!existing || existing[column] !== role.id) {
      return interaction.reply({ embeds: [errorEmbed(`That role is not set for ${column === 'bots_role' ? 'bots' : 'humans'}.`)] });
    }

    await db('vcrole_config').where({ guild_id: guildId }).update({ [column]: null });

    const label = column === 'bots_role' ? 'bots' : 'humans';
    const embed = new EmbedBuilder()
      .setTitle('VC Role Removed')
      .setDescription(`No role will be auto-assigned to ${label} when they join voice.`)
      .setColor(embedColors.success)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [errorEmbed('Failed to remove VC role.')] });
  }
}

async function handleConfig(interaction, guildId) {
  try {
    const db = getDB();
    await ensureTable(db);

    const config = await db('vcrole_config').where({ guild_id: guildId }).first();

    if (!config || (!config.bots_role && !config.humans_role)) {
      return interaction.reply({ embeds: [infoEmbed('No VC role configuration found. Use `vcrole bots/humans add` to set one up.')] });
    }

    const embed = new EmbedBuilder()
      .setTitle('VC Role Configuration')
      .setColor(embedColors.info)
      .addFields(
        { name: 'Bots Role', value: config.bots_role ? `<@&${config.bots_role}>` : 'Not set', inline: true },
        { name: 'Humans Role', value: config.humans_role ? `<@&${config.humans_role}>` : 'Not set', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [errorEmbed('Failed to fetch VC role config.')] });
  }
}

async function handleReset(interaction, guildId) {
  try {
    const db = getDB();
    await ensureTable(db);

    const deleted = await db('vcrole_config').where({ guild_id: guildId }).del();

    const embed = new EmbedBuilder()
      .setTitle('VC Role Reset')
      .setDescription(deleted
        ? 'All VC role settings have been cleared.'
        : 'No VC role settings to clear.')
      .setColor(embedColors.success)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [errorEmbed('Failed to reset VC role config.')] });
  }
}
