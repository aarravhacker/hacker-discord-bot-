const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');

const glitchChars = '̴̡̧̨̢̧̨̧̛̛̛̛̛̛̣̤̹̹̥̹̗̣̟̘̞̗̮̳̫̪̲̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻̹̘̞̫̲̘̻';

function glitchText(text, intensity = 3) {
  return text.split('').map(c => {
    if (c === ' ') return ' ';
    let result = c;
    for (let i = 0; i < intensity; i++) {
      result += glitchChars[Math.floor(Math.random() * glitchChars.length)];
    }
    return result;
  }).join('');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('glitch')
    .setDescription('Make text look glitchy')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to glitch').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('intensity').setDescription('Intensity 1-5 (default 3)').setMinValue(1).setMaxValue(5)
    ),
  cooldown: 3,
  aliases: ['corrupt', 'broken'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const text = args?.join(' ') || interaction.options?.getString('text');
            const intensity = interaction.options?.getInteger('intensity') || 3;
            if (!text) {
              return interaction.reply({ embeds: [createEmbed('⚠️ Please provide text.', 'warning')] });
            }
            const result = glitchText(text, intensity);
            interaction.reply({ embeds: [createEmbed(result, 'info')] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};