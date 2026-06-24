const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pow')
    .setDescription('Raise a number to a power')
    .addNumberOption(opt => opt.setName('base').setDescription('Base number').setRequired(true))
    .addNumberOption(opt => opt.setName('exponent').setDescription('Exponent').setRequired(true)),
  cooldown: 3,
  aliases: ['sqrt', 'log'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const base = interaction.options?.getNumber('base') || parseFloat(args[0]);
      const exponent = interaction.options?.getNumber('exponent') || parseFloat(args[1]);

      if (isNaN(base) || isNaN(exponent)) {
        return interaction.reply({ embeds: [errorEmbed('Please provide valid numbers.')] });
      }

      const result = Math.pow(base, exponent);
      const embed = new EmbedBuilder()
        .setColor(config.embedColors.math || '#00BFFF')
        .setTitle('Power')
        .setDescription(`\`${base}^${exponent} = ${result}\``)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to calculate.')] });
    }
  }
};
