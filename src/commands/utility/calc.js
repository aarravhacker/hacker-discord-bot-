const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calc')
    .setDescription('Calculates a math expression')
    .addStringOption(opt => opt.setName('expression').setDescription('Math expression to evaluate').setRequired(true)),
  cooldown: 3,
  aliases: ['calculate', 'math'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const expr = isSlash ? interaction.options?.getString('expression') : args?.join(' ');
    if (!expr) return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Please provide a math expression.').setColor(config.embedColors.error)] });

    try {
      const sanitized = expr.replace(/[^0-9+\-*/().%^ ]/g, '');
      if (!sanitized) return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Invalid expression.').setColor(config.embedColors.error)] });

      const result = Function('"use strict"; return (' + sanitized + ')')();

      const embed = new EmbedBuilder()
        .setTitle('Calculator')
        .setColor(config.embedColors.success)
        .addFields(
          { name: 'Expression', value: `\`${expr}\``, inline: true },
          { name: 'Result', value: `\`${result}\``, inline: true }
        )
        .setTimestamp();

      interaction.reply({ embeds: [embed] });
    } catch (e) {
      interaction.reply({ embeds: [new EmbedBuilder().setDescription('Error evaluating expression.').setColor(config.embedColors.error)] });
    }
  }
};
