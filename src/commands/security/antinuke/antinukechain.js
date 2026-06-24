const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');
const { addSecurityLog } = require('../../../db/securityRepository');
const logger = require('../../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukechain')
    .setDescription('Detect chain reaction attacks (one action triggering many)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('enable').setDescription('Enable chain reaction detection'))
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Disable chain reaction detection'))
    .addSubcommand(sub =>
      sub.setName('config')
        .setDescription('Configure chain detection')
        .addIntegerOption(opt => opt.setName('threshold').setDescription('Actions before chain detected (2-20)').setMinValue(2).setMaxValue(20))
        .addIntegerOption(opt => opt.setName('window').setDescription('Time window in seconds (5-120)').setMinValue(5).setMaxValue(120)))
    .addSubcommand(sub =>
      sub.setName('status').setDescription('View chain detection status'))
    .addSubcommand(sub =>
      sub.setName('history').setDescription('View chain reaction history')),

  cooldown: 5,
  aliases: ['achain', 'chaindetect'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permission.', ephemeral: true });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'status').toLowerCase();
    const { getGuild, updateGuild } = require('../../../db/guildRepository');
    const guildData = await getGuild(interaction.guild.id);

    if (subcommand === 'enable') {
      const config = JSON.parse(guildData.antinuke_config || '{}');
      config.chainDetection = true;
      config.chainThreshold = config.chainThreshold || 5;
      config.chainWindow = config.chainWindow || 30;
      await updateGuild(interaction.guild.id, { antinuke_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Chain reaction detection enabled. Threshold: ${config.chainThreshold} actions in ${config.chainWindow}s.`)] });
    }

    if (subcommand === 'disable') {
      const config = JSON.parse(guildData.antinuke_config || '{}');
      config.chainDetection = false;
      await updateGuild(interaction.guild.id, { antinuke_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Chain reaction detection disabled.')] });
    }

    if (subcommand === 'config') {
      const config = JSON.parse(guildData.antinuke_config || '{}');
      const threshold = isSlash ? interaction.options.getInteger('threshold') : parseInt(args[0]) || null;
      const window = isSlash ? interaction.options.getInteger('window') : parseInt(args[1]) || null;

      if (threshold) config.chainThreshold = threshold;
      if (window) config.chainWindow = window;
      config.chainDetection = true;

      await updateGuild(interaction.guild.id, { antinuke_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Chain detection configured: **${config.chainThreshold}** actions in **${config.chainWindow}s**.`)] });
    }

    if (subcommand === 'status') {
      const config = JSON.parse(guildData.antinuke_config || '{}');
      const enabled = config.chainDetection || false;
      const threshold = config.chainThreshold || 5;
      const window = config.chainWindow || 30;

      const incidents = securityEngine.getIncidents(interaction.guild.id, 100);
      const chainIncidents = incidents.filter(i => i.type === 'chain_reaction');

      return interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(enabled ? 0x00ff00 : 0xff0000)
        .setTitle('Chain Reaction Detection')
        .addFields(
          { name: 'Status', value: enabled ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Threshold', value: `${threshold} actions`, inline: true },
          { name: 'Window', value: `${window}s`, inline: true },
          { name: 'Chains Detected', value: `${chainIncidents.length}`, inline: true }
        )
        .setTimestamp()
      ] });
    }

    if (subcommand === 'history') {
      const incidents = securityEngine.getIncidents(interaction.guild.id, 100);
      const chains = incidents.filter(i => i.type === 'chain_reaction' || i.type?.includes('chain'));

      const embed = new EmbedBuilder()
        .setColor(chains.length > 0 ? 0xff8800 : 0x00ff00)
        .setTitle('Chain Reaction History')
        .setDescription(chains.length > 0 ? 'Recent chain reactions:' : 'No chain reactions detected.')
        .setTimestamp();

      if (chains.length > 0) {
        const list = chains.slice(0, 10).map(c => `\`${new Date(c.timestamp).toLocaleString()}\` **${c.type}** by <@${c.userId}>`).join('\n');
        embed.addFields({ name: 'History', value: list.substring(0, 1024) });
      }

      return interaction.reply({ embeds: [embed] });
    }
  }
};
