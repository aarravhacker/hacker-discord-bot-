const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fibonacci')
    .setDescription('Calculate Fibonacci number')
    .addIntegerOption(opt => opt.setName('n').setDescription('Position in Fibonacci sequence').setRequired(true)),
  cooldown: 3,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    try {
      const n = interaction.options?.getInteger('n') || parseInt(args[0]);

      if (isNaN(n) || n < 0) {
        return interaction.reply({ embeds: [errorEmbed('Please provide a non-negative integer.')] });
      }

      if (n > 70) {
        return interaction.reply({ embeds: [errorEmbed('Number too large. Maximum is 70.')] });
      }

      let a = 0, b = 1;
      for (let i = 2; i <= n; i++) {
        [a, b] = [b, a + b];
      }
      const result = n === 0 ? 0 : b;

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.math || '#00BFFF')
        .setTitle('Fibonacci')
        .setDescription(`Fibonacci(${n}) = **${result}**`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to calculate.')] });
    }
  }
};
