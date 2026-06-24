const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { addSecurityLog } = require('../../../db/securityRepository');
const logger = require('../../../utils/logger');

const floodTracker = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispamflood')
    .setDescription('Configure flood protection (mass messages in short time)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('config')
        .setDescription('Configure flood settings')
        .addIntegerOption(opt => opt.setName('threshold').setDescription('Messages to trigger flood (3-30)').setMinValue(3).setMaxValue(30))
        .addIntegerOption(opt => opt.setName('window').setDescription('Time window in seconds (1-30)').setMinValue(1).setMaxValue(30))
        .addStringOption(opt => opt.setName('action').setDescription('Action to take')
          .addChoices({ name: 'Delete', value: 'delete' }, { name: 'Mute', value: 'mute' }, { name: 'Kick', value: 'kick' }, { name: 'Ban', value: 'ban' })))
    .addSubcommand(sub =>
      sub.setName('ignore').setDescription('Add channel or role to flood ignore list')
        .addStringOption(opt => opt.setName('type').setDescription('Type to ignore').setRequired(true)
          .addChoices({ name: 'Channel', value: 'channel' }, { name: 'Role', value: 'role' }))
        .addStringOption(opt => opt.setName('id').setDescription('Channel/Role ID').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('unignore').setDescription('Remove channel or role from ignore list')
        .addStringOption(opt => opt.setName('type').setDescription('Type to remove').setRequired(true)
          .addChoices({ name: 'Channel', value: 'channel' }, { name: 'Role', value: 'role' }))
        .addStringOption(opt => opt.setName('id').setDescription('Channel/Role ID').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('monitor').setDescription('View current flood activity'))
    .addSubcommand(sub =>
      sub.setName('clear').setDescription('Clear flood ignore lists')),

  cooldown: 5,
  aliases: ['asflood', 'flood'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permission.', ephemeral: true });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'monitor').toLowerCase();
    const guildData = await getGuild(interaction.guild.id);
    const config = JSON.parse(guildData.antispam_config || '{}');

    if (!config.flood) {
      config.flood = { threshold: 8, window: 5, action: 'mute', ignoredChannels: [], ignoredRoles: [] };
    }

    if (subcommand === 'config') {
      const threshold = isSlash ? interaction.options.getInteger('threshold') : parseInt(args[0]);
      const window = isSlash ? interaction.options.getInteger('window') : parseInt(args[1]);
      const action = isSlash ? interaction.options.getString('action') : args[2];
      if (threshold) config.flood.threshold = threshold;
      if (window) config.flood.window = window;
      if (action) config.flood.action = action;

      await updateGuild(interaction.guild.id, { antispam_config: JSON.stringify(config) });
      await addSecurityLog({ guild_id: interaction.guild.id, user_id: user.id, action: 'flood_config_updated', type: 'antispam', details: JSON.stringify(config.flood) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Flood settings: **${config.flood.threshold}** messages in **${config.flood.window}s** → **${config.flood.action}**`).setTimestamp()] });
    }

    if (subcommand === 'ignore') {
      const type = isSlash ? interaction.options.getString('type') : args[0];
      const id = isSlash ? interaction.options.getString('id') : args[1];
      if (!type || !id) return interaction.reply({ content: 'Provide type and ID.', ephemeral: true });
      const list = type === 'channel' ? config.flood.ignoredChannels : config.flood.ignoredRoles;
      if (!list.includes(id)) list.push(id);
      await updateGuild(interaction.guild.id, { antispam_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Added **${id}** to flood ${type} ignore list.`)] });
    }

    if (subcommand === 'unignore') {
      const type = isSlash ? interaction.options.getString('type') : args[0];
      const id = isSlash ? interaction.options.getString('id') : args[1];
      if (!type || !id) return interaction.reply({ content: 'Provide type and ID.', ephemeral: true });
      const list = type === 'channel' ? config.flood.ignoredChannels : config.flood.ignoredRoles;
      const idx = list.indexOf(id);
      if (idx > -1) list.splice(idx, 1);
      await updateGuild(interaction.guild.id, { antispam_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Removed **${id}** from flood ${type} ignore list.`)] });
    }

    if (subcommand === 'monitor') {
      const entries = [];
      floodTracker.forEach((data, key) => {
        if (key.startsWith(interaction.guild.id)) {
          entries.push({ key, ...data });
        }
      });
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Flood Activity Monitor')
        .setDescription(entries.length > 0 ? entries.map(e => `<@${e.userId}>: ${e.count} msgs in ${e.window}s`).join('\n') : 'No flood activity detected.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'clear') {
      config.flood.ignoredChannels = [];
      config.flood.ignoredRoles = [];
      await updateGuild(interaction.guild.id, { antispam_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription('Flood ignore lists cleared.')] });
    }
  }
};
