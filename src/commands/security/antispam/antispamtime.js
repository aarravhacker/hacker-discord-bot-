const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispamtime')
    .setDescription('Set the time window for antispam')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('seconds').setDescription('Time window in seconds (1-60)').setRequired(true).setMinValue(1).setMaxValue(60)
    ),
  cooldown: 5,
  aliases: ['astime'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      let seconds;

      if (isSlash) {
        seconds = interaction.options?.getInteger('seconds');
      } else {
        seconds = parseInt(interaction.content.split(' ')[1]);
        if (isNaN(seconds) || seconds < 1 || seconds > 60) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Time must be between 1 and 60 seconds.')] });
        }
      }

      const guildData = await getGuild(guild.id);
      let antispamConfig = JSON.parse(guildData.antispam_config || '{}');
      antispamConfig.timeWindow = seconds * 1000;
      await updateGuild(guild.id, { antispam_config: JSON.stringify(antispamConfig) });

      const embed = successEmbed(
        'Antispam Time Window Updated',
        `**Time Window:** ${seconds}s`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to update antispam time window.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
