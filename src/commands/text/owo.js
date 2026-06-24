const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');

function owoify(text) {
  let result = text;
  result = result.replace(/[rl]/gi, 'w');
  result = result.replace(/([RL])/gi, 'W');
  result = result.replace(/n([aeiou])/gi, 'ny$1');
  result = result.replace(/N([aeiou])/gi, 'Ny$1');
  result = result.replace(/N([AEIOU])/gi, 'NY$1');
  result = result.replace(/ove/gi, 'uv');
  const suffixes = [' owo', ' OwO', ' uwu', ' :3', ' ^w^'];
  result += suffixes[Math.floor(Math.random() * suffixes.length)];
  return result;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('owo')
    .setDescription('OwO-ify your text')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to OwO-ify').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['owofy', 'owoify'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const text = args?.join(' ') || interaction.options?.getString('text');
            if (!text) {
              return interaction.reply({ embeds: [createEmbed('⚠️ Please provide text.', 'warning')] });
            }
            const result = owoify(text);
            interaction.reply({ embeds: [createEmbed(result, 'info')] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};