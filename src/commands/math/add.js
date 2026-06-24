const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add two numbers')
    .addNumberOption(opt => opt.setName('a').setDescription('First number').setRequired(true))
    .addNumberOption(opt => opt.setName('b').setDescription('Second number').setRequired(true)),
  cooldown: 3,
  aliases: ['subtract', 'multiply', 'divide'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const a = interaction.options?.getNumber('a') || parseFloat(args[0]);
      const b = interaction.options?.getNumber('b') || parseFloat(args[1]);

      if (isNaN(a) || isNaN(b)) {
        return interaction.reply({ embeds: [errorEmbed('Please provide two valid numbers.')] });
      }

      const result = a + b;
      const embed = new EmbedBuilder()
        .setColor(config.embedColors.math || '#00BFFF')
        .setTitle('Addition')
        .setDescription(`\`${a} + ${b} = ${result}\``)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to calculate.')] });
    }
  }
};
