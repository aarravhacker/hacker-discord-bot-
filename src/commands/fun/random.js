const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('random')
    .setDescription('Generate a random number')
    .addIntegerOption(option =>
      option.setName('min').setDescription('Minimum value (default 1)').setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('max').setDescription('Maximum value (default 100)').setRequired(false)
    ),
  cooldown: 3,
  aliases: ['random', 'rand'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const min = interaction.options?.getInteger('min') || parseInt(args?.[0]) || 1;
            const max = interaction.options?.getInteger('max') || parseInt(args?.[1]) || 100;

            if (min > max) {
              return interaction.reply({ embeds: [errorEmbed('Minimum value cannot be greater than maximum.')] });
            }

            if (min === max) {
              return interaction.reply({ embeds: [errorEmbed('Minimum and maximum cannot be the same.')] });
            }

            const result = Math.floor(Math.random() * (max - min + 1)) + min;

            const embed = successEmbed('Random Number')
              .setDescription(`🎲 **${result}** (between ${min} and ${max})`)
              .setColor(0x9B59B6);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};