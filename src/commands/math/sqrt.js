const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sqrt')
    .setDescription('Calculate square root')
    .addNumberOption(opt => opt.setName('number').setDescription('Number').setRequired(true)),
  cooldown: 3,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    try {
      const number = interaction.options?.getNumber('number') || parseFloat(args[0]);

      if (isNaN(number)) {
        return interaction.reply({ embeds: [errorEmbed('Please provide a valid number.')] });
      }

      if (number < 0) {
        return interaction.reply({ embeds: [errorEmbed('Cannot calculate square root of a negative number.')] });
      }

      const result = Math.sqrt(number);
      const embed = new EmbedBuilder()
        .setColor(config.embedColors.math || '#00BFFF')
        .setTitle('Square Root')
        .setDescription(`\`√${number} = ${result}\``)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to calculate.')] });
    }
  }
};
