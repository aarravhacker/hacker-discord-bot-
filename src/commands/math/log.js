const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('log')
    .setDescription('Calculate logarithm')
    .addNumberOption(opt => opt.setName('number').setDescription('Number').setRequired(true))
    .addNumberOption(opt => opt.setName('base').setDescription('Log base (default: 10)').setRequired(false)),
  cooldown: 3,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    try {
      const number = interaction.options?.getNumber('number') || parseFloat(args[0]);
      const base = interaction.options?.getNumber('base') || (args[1] ? parseFloat(args[1]) : 10);

      if (isNaN(number) || isNaN(base)) {
        return interaction.reply({ embeds: [errorEmbed('Please provide valid numbers.')] });
      }

      if (number <= 0 || base <= 0 || base === 1) {
        return interaction.reply({ embeds: [errorEmbed('Invalid input for logarithm.')] });
      }

      const result = Math.log(number) / Math.log(base);
      const embed = new EmbedBuilder()
        .setColor(config.embedColors.math || '#00BFFF')
        .setTitle('Logarithm')
        .setDescription(`\`log_${base}(${number}) = ${result}\``)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to calculate.')] });
    }
  }
};
