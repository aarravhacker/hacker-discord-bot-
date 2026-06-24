const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');

const COLORS = {
  success: 0x00ff00,
  error: 0xff0000,
  warning: 0xffa500,
  info: 0x2f3136,
};

const TABLES = {
  channel: 'ignored_channels',
  user: 'ignored_users',
  command: 'ignored_commands',
  module: 'ignored_modules',
  bypassChannel: 'ignore_bypass_channels',
  bypassUser: 'ignore_bypass_users',
};

const ID_FIELDS = {
  channel: 'channel_id',
  user: 'user_id',
  command: 'command_name',
  module: 'module_name',
  bypassChannel: 'channel_id',
  bypassUser: 'user_id',
};

const LABELS = {
  channel: 'Channel',
  user: 'User',
  command: 'Command',
  module: 'Module',
  bypassChannel: 'Bypass Channel',
  bypassUser: 'Bypass User',
};

async function ensureTable(db, tableName) {
  const exists = await db.schema.hasTable(tableName);
  if (!exists) {
    await db.schema.createTable(tableName, (t) => {
      t.increments('id').primary();
      t.string('guild_id').notNullable();
      t.string(`${ID_FIELDS[Object.keys(TABLES).find((k) => TABLES[k] === tableName)] || 'id'}`).notNullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
  }
}

function parsePrefixArgs(content, prefix) {
  const args = content.slice(prefix.length).trim().split(/\s+/);
  args.shift();
  return args;
}

function formatTimestamp(date) {
  const ts = Math.floor(new Date(date).getTime() / 1000);
  return `<t:${ts}:f> (<t:${ts}:R>)`;
}

function formatValue(type, value) {
  if (type === 'channel') return `<#${value}>`;
  if (type === 'user') return `<@${value}>`;
  if (type === 'bypassChannel') return `<#${value}>`;
  if (type === 'bypassUser') return `<@${value}>`;
  return `\`${value}\``;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ignore')
    .setDescription('Complete ignore system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommandGroup((group) =>
      group
        .setName('channel')
        .setDescription('Manage ignored channels')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Add a channel to the ignore list')
            .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to ignore').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Remove a channel from the ignore list')
            .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to unignore').setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('show').setDescription('Show all ignored channels'))
    )
    .addSubcommandGroup((group) =>
      group
        .setName('user')
        .setDescription('Manage ignored users')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Add a user to the ignore list')
            .addUserOption((opt) => opt.setName('user').setDescription('User to ignore').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Remove a user from the ignore list')
            .addUserOption((opt) => opt.setName('user').setDescription('User to unignore').setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('show').setDescription('Show all ignored users'))
    )
    .addSubcommandGroup((group) =>
      group
        .setName('command')
        .setDescription('Manage ignored commands')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Add a command to the ignore list')
            .addStringOption((opt) => opt.setName('command').setDescription('Command name to ignore').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Remove a command from the ignore list')
            .addStringOption((opt) => opt.setName('command').setDescription('Command name to unignore').setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('show').setDescription('Show all ignored commands'))
    )
    .addSubcommandGroup((group) =>
      group
        .setName('module')
        .setDescription('Manage ignored modules')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Add a module to the ignore list')
            .addStringOption((opt) => opt.setName('module').setDescription('Module name to ignore').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Remove a module from the ignore list')
            .addStringOption((opt) => opt.setName('module').setDescription('Module name to unignore').setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('show').setDescription('Show all ignored modules'))
    )
    .addSubcommandGroup((group) =>
      group
        .setName('bypasschannel')
        .setDescription('Manage bypass channels')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Add a bypass channel')
            .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to bypass').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Remove a bypass channel')
            .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to remove bypass').setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('show').setDescription('Show all bypass channels'))
    )
    .addSubcommandGroup((group) =>
      group
        .setName('bypassuser')
        .setDescription('Manage bypass users')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Add a bypass user')
            .addUserOption((opt) => opt.setName('user').setDescription('User to bypass').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Remove a bypass user')
            .addUserOption((opt) => opt.setName('user').setDescription('User to remove bypass').setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('show').setDescription('Show all bypass users'))
    ),

  async execute(interaction) {
    const db = getDB();
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();

    await ensureTable(db, TABLES[group]);

    if (sub === 'show') return handleShow(interaction, db, group);
    if (sub === 'add') return handleAdd(interaction, db, group);
    if (sub === 'remove') return handleRemove(interaction, db, group);
  },

  async executePrefix(message, prefix) {
    const db = getDB();
    const args = parsePrefixArgs(message.content, prefix);

    if (args.length < 1) {
      return sendError(message, 'Usage: `!ignore <channel|user|command|module|bypasschannel|bypassuser> <add|remove|show> [target]`');
    }

    const groupArg = args[0].toLowerCase();
    const groupMap = {
      channel: 'channel',
      user: 'user',
      command: 'command',
      module: 'module',
      bypasschannel: 'bypassChannel',
      bypassuser: 'bypassUser',
    };

    const group = groupMap[groupArg];
    if (!group) {
      return sendError(message, 'Invalid group. Use: `channel`, `user`, `command`, `module`, `bypasschannel`, or `bypassuser`.');
    }

    const subArg = args[1]?.toLowerCase();
    if (!subArg || !['add', 'remove', 'show'].includes(subArg)) {
      return sendError(message, 'Usage: `!ignore ' + groupArg + ' <add|remove|show> [target]`');
    }

    await ensureTable(db, TABLES[group]);

    if (subArg === 'show') return handleShowPrefix(message, db, group);
    if (subArg === 'add') return handleAddPrefix(message, db, group, args.slice(2));
    if (subArg === 'remove') return handleRemovePrefix(message, db, group, args.slice(2));
  },
  adminOnly: true
};

async function handleAdd(interaction, db, group) {
  const table = TABLES[group];
  const idField = ID_FIELDS[group];
  const label = LABELS[group];

  let value;
  if (group === 'channel' || group === 'bypassChannel') {
    value = interaction.options.getChannel('channel').id;
  } else if (group === 'user' || group === 'bypassUser') {
    value = interaction.options.getUser('user').id;
  } else if (group === 'command') {
    value = interaction.options.getString('command').toLowerCase();
  } else if (group === 'module') {
    value = interaction.options.getString('module').toLowerCase();
  }

  const existing = await db(table).where({ guild_id: interaction.guildId, [idField]: value }).first();
  if (existing) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setDescription(`${label} ${formatValue(group, value)} is already ignored.`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  await db(table).insert({ guild_id: interaction.guildId, [idField]: value, created_at: new Date() });

  console.log(`[IGNORE] ${interaction.user.tag} added ${label} ${value} to ignore list in ${interaction.guild.name}`);

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setDescription(`Added ${label} ${formatValue(group, value)} to the ignore list.`);
  return interaction.reply({ embeds: [embed] });
}

async function handleRemove(interaction, db, group) {
  const table = TABLES[group];
  const idField = ID_FIELDS[group];
  const label = LABELS[group];

  let value;
  if (group === 'channel' || group === 'bypassChannel') {
    value = interaction.options.getChannel('channel').id;
  } else if (group === 'user' || group === 'bypassUser') {
    value = interaction.options.getUser('user').id;
  } else if (group === 'command') {
    value = interaction.options.getString('command').toLowerCase();
  } else if (group === 'module') {
    value = interaction.options.getString('module').toLowerCase();
  }

  const existing = await db(table).where({ guild_id: interaction.guildId, [idField]: value }).first();
  if (!existing) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setDescription(`${label} ${formatValue(group, value)} is not in the ignore list.`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  await db(table).where({ guild_id: interaction.guildId, [idField]: value }).del();

  console.log(`[IGNORE] ${interaction.user.tag} removed ${label} ${value} from ignore list in ${interaction.guild.name}`);

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setDescription(`Removed ${label} ${formatValue(group, value)} from the ignore list.`);
  return interaction.reply({ embeds: [embed] });
}

async function handleShow(interaction, db, group) {
  const table = TABLES[group];
  const idField = ID_FIELDS[group];
  const label = LABELS[group];

  const rows = await db(table).where({ guild_id: interaction.guildId }).orderBy('created_at', 'desc');

  if (rows.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(`${label} Ignore List`)
      .setDescription('No entries found.');
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  const list = rows.map((r, i) => `${i + 1}. ${formatValue(group, r[idField])} — Added ${formatTimestamp(r.created_at)}`).join('\n');

  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`${label} Ignore List`)
    .setDescription(list)
    .setFooter({ text: `${rows.length} total entries` });

  return interaction.reply({ embeds: [embed] });
}

async function handleAddPrefix(message, db, group, args) {
  const table = TABLES[group];
  const idField = ID_FIELDS[group];
  const label = LABELS[group];

  if (args.length < 1) {
    return sendError(message, `Provide a target. Usage: \`!ignore ${Object.keys(TABLES).find((k) => TABLES[k] === table)?.toLowerCase()} add <target>\``);
  }

  let value;
  if (group === 'channel' || group === 'bypassChannel') {
    const mention = args[0];
    const match = mention.match(/^<#(\d+)>$/) || mention.match(/^(\d+)$/);
    if (!match) return sendError(message, 'Invalid channel. Mention a channel or provide its ID.');
    value = match[1];
  } else if (group === 'user' || group === 'bypassUser') {
    const mention = args[0];
    const match = mention.match(/^<@!?(\d+)>$/) || mention.match(/^(\d+)$/);
    if (!match) return sendError(message, 'Invalid user. Mention a user or provide their ID.');
    value = match[1];
  } else {
    value = args[0].toLowerCase();
  }

  const existing = await db(table).where({ guild_id: message.guildId, [idField]: value }).first();
  if (existing) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setDescription(`${label} ${formatValue(group, value)} is already ignored.`);
    return message.reply({ embeds: [embed] });
  }

  await db(table).insert({ guild_id: message.guildId, [idField]: value, created_at: new Date() });

  console.log(`[IGNORE] ${message.author.tag} added ${label} ${value} to ignore list in ${message.guild.name}`);

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setDescription(`Added ${label} ${formatValue(group, value)} to the ignore list.`);
  return message.reply({ embeds: [embed] });
}

async function handleRemovePrefix(message, db, group, args) {
  const table = TABLES[group];
  const idField = ID_FIELDS[group];
  const label = LABELS[group];

  if (args.length < 1) {
    return sendError(message, `Provide a target. Usage: \`!ignore ${Object.keys(TABLES).find((k) => TABLES[k] === table)?.toLowerCase()} remove <target>\``);
  }

  let value;
  if (group === 'channel' || group === 'bypassChannel') {
    const mention = args[0];
    const match = mention.match(/^<#(\d+)>$/) || mention.match(/^(\d+)$/);
    if (!match) return sendError(message, 'Invalid channel. Mention a channel or provide its ID.');
    value = match[1];
  } else if (group === 'user' || group === 'bypassUser') {
    const mention = args[0];
    const match = mention.match(/^<@!?(\d+)>$/) || mention.match(/^(\d+)$/);
    if (!match) return sendError(message, 'Invalid user. Mention a user or provide their ID.');
    value = match[1];
  } else {
    value = args[0].toLowerCase();
  }

  const existing = await db(table).where({ guild_id: message.guildId, [idField]: value }).first();
  if (!existing) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setDescription(`${label} ${formatValue(group, value)} is not in the ignore list.`);
    return message.reply({ embeds: [embed] });
  }

  await db(table).where({ guild_id: message.guildId, [idField]: value }).del();

  console.log(`[IGNORE] ${message.author.tag} removed ${label} ${value} from ignore list in ${message.guild.name}`);

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setDescription(`Removed ${label} ${formatValue(group, value)} from the ignore list.`);
  return message.reply({ embeds: [embed] });
}

async function handleShowPrefix(message, db, group) {
  const table = TABLES[group];
  const idField = ID_FIELDS[group];
  const label = LABELS[group];

  const rows = await db(table).where({ guild_id: message.guildId }).orderBy('created_at', 'desc');

  if (rows.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(`${label} Ignore List`)
      .setDescription('No entries found.');
    return message.reply({ embeds: [embed] });
  }

  const list = rows.map((r, i) => `${i + 1}. ${formatValue(group, r[idField])} — Added ${formatTimestamp(r.created_at)}`).join('\n');

  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`${label} Ignore List`)
    .setDescription(list)
    .setFooter({ text: `${rows.length} total entries` });

  return message.reply({ embeds: [embed] });
}

function sendError(message, content) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.error)
    .setDescription(content);
  return message.reply({ embeds: [embed] });
}
