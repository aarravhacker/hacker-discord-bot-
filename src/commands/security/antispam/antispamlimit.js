const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispamlimit')
    .setDescription('Set the message limit for antispam')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('limit').setDescription('Max messages (1-50)').setRequired(true).setMinValue(1).setMaxValue(50)
    )
    .addIntegerOption(opt =>
      opt.setName('timeframe').setDescription('Time frame in seconds').setMinValue(1).setMaxValue(60)
    ),
  cooldown: 5,
  aliases: ['aslimit'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      let limit;
      let timeframe;

      if (isSlash) {
        limit = interaction.options?.getInteger('limit');
        timeframe = interaction.options?.getInteger('timeframe');
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (args.length === 0) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Usage: antispamlimit <limit> [timeframe]')] });
        }
        limit = parseInt(args[0]);
        timeframe = parseInt(args[1]);
        if (isNaN(limit) || limit < 1 || limit > 50) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Limit must be between 1 and 50.')] });
        }
      }

      const guildData = await getGuild(guild.id);
      let antispamConfig = JSON.parse(guildData.antispam_config || '{}');
      antispamConfig.messageLimit = limit;
      if (timeframe && !isNaN(timeframe)) {
        antispamConfig.timeWindow = timeframe * 1000;
      }
      await updateGuild(guild.id, { antispam_config: JSON.stringify(antispamConfig) });

      const embed = successEmbed(
        'Antispam Limit Updated',
        `**Message Limit:** ${limit}\n` +
        (timeframe ? `**Time Window:** ${timeframe}s` : '')
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to update antispam limit.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
