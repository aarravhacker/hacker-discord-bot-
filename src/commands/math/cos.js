const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cos')
    .setDescription('Calculate cosine')
    .addNumberOption(opt => opt.setName('angle').setDescription('Angle in degrees').setRequired(true)),
  cooldown: 3,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    try {
      const angle = interaction.options?.getNumber('angle') || parseFloat(args[0]);

      if (isNaN(angle)) {
        return interaction.reply({ embeds: [errorEmbed('Please provide a valid angle.')] });
      }

      const radians = angle * (Math.PI / 180);
      const result = Math.cos(radians);
      const embed = new EmbedBuilder()
        .setColor(config.embedColors.math || '#00BFFF')
        .setTitle('Cosine')
        .setDescription(`\`cos(${angle}°) = ${result}\``)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to calculate.')] });
    }
  }
};
