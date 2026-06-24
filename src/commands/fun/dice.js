const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll a dice')
    .addIntegerOption(option =>
      option.setName('sides').setDescription('Number of sides (default 6)').setRequired(false)
    ),
  cooldown: 3,
  aliases: ['dice', 'd'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const sides = interaction.options?.getInteger('sides') || parseInt(args?.[0]) || 6;

            if (sides < 2 || sides > 100) {
              return interaction.reply({ embeds: [errorEmbed('Please provide a valid number of sides (2-100).')] });
            }

            const result = Math.floor(Math.random() * sides) + 1;

            const embed = successEmbed('Dice Roll')
              .setDescription(`🎲 You rolled a **${result}** (1-${sides})`)
              .setColor(0xFF0000);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};