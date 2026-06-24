const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');

function uwufy(text) {
  let result = text;
  result = result.replace(/[rl]/gi, 'w');
  result = result.replace(/([RL])/gi, 'W');
  result = result.replace(/n([aeiou])/gi, 'ny$1');
  result = result.replace(/N([aeiou])/gi, 'Ny$1');
  result = result.replace(/N([AEIOU])/gi, 'NY$1');
  result = result.replace(/ove/gi, 'uv');
  result = result.replace(/!+/gi, ' uwu');
  result = result.replace(/\?+/gi, ' OwO');
  const faces = [' OwO', ' UwU', ' >w<', ' ^w^', ' :3', ' =w=', ' (◕ᴗ◕✿)'];
  result += faces[Math.floor(Math.random() * faces.length)];
  return result;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uwu')
    .setDescription('UwU-ify your text')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to UwU-ify').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['uwufy'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const text = args?.join(' ') || interaction.options?.getString('text');
            if (!text) {
              return interaction.reply({ embeds: [createEmbed('⚠️ Please provide text.', 'warning')] });
            }
            const result = uwufy(text);
            interaction.reply({ embeds: [createEmbed(result, 'info')] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};