const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('factorial')
    .setDescription('Calculate factorial')
    .addIntegerOption(opt => opt.setName('number').setDescription('Number').setRequired(true)),
  cooldown: 3,
  aliases: ['fibonacci'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const number = interaction.options?.getInteger('number') || parseInt(args[0]);

      if (isNaN(number) || number < 0) {
        return interaction.reply({ embeds: [errorEmbed('Please provide a non-negative integer.')] });
      }

      if (number > 170) {
        return interaction.reply({ embeds: [errorEmbed('Number too large. Maximum is 170.')] });
      }

      let result = 1;
      for (let i = 2; i <= number; i++) {
        result *= i;
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.math || '#00BFFF')
        .setTitle('Factorial')
        .setDescription(`\`${number}! = ${result}\``)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to calculate.')] });
    }
  }
};
