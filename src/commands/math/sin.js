const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sin')
    .setDescription('Calculate sine')
    .addNumberOption(opt => opt.setName('angle').setDescription('Angle in degrees').setRequired(true)),
  cooldown: 3,
  aliases: ['cos', 'tan'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const angle = interaction.options?.getNumber('angle') || parseFloat(args[0]);

      if (isNaN(angle)) {
        return interaction.reply({ embeds: [errorEmbed('Please provide a valid angle.')] });
      }

      const radians = angle * (Math.PI / 180);
      const result = Math.sin(radians);
      const embed = new EmbedBuilder()
        .setColor(config.embedColors.math || '#00BFFF')
        .setTitle('Sine')
        .setDescription(`\`sin(${angle}°) = ${result}\``)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to calculate.')] });
    }
  }
};
