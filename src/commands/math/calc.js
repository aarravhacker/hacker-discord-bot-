const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calc')
    .setDescription('Calculate a math expression')
    .addStringOption(opt => opt.setName('expression').setDescription('Math expression').setRequired(true)),
  cooldown: 3,
  aliases: ['calculate', 'math'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const expression = interaction.options?.getString('expression') || args.join(' ');
      if (!expression) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /calc <expression>\nExample: /calc 2 + 2 * 3')] });
      }

      const sanitized = expression.replace(/[^0-9+\-*/().%^]/g, '');
      if (!sanitized) {
        return interaction.reply({ embeds: [errorEmbed('Invalid expression. Use only numbers and operators (+, -, *, /, ^).')] });
      }

      const evalExpr = sanitized.replace(/\^/g, '**');
      let result;
      try {
        result = new Function(`return (${evalExpr})`)();
      } catch {
        return interaction.reply({ embeds: [errorEmbed('Invalid math expression.')] });
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.math || '#00BFFF')
        .setTitle('Calculator')
        .addFields(
          { name: 'Expression', value: `\`${expression}\`` },
          { name: 'Result', value: `\`${result}\`` }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to calculate.')] });
    }
  }
};
