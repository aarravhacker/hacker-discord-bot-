const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ascii')
    .setDescription('Convert text to ASCII art')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to convert').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['asciart', 'asciiart'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const text = args?.join(' ') || interaction.options?.getString('text');
            if (!text) {
              return interaction.reply({ embeds: [createEmbed('⚠️ Please provide text to convert.', 'warning')] });
            }
            if (text.length > 30) {
              return interaction.reply({ embeds: [createEmbed('⚠️ Text must be 30 characters or less.', 'warning')] });
            }
            const upper = text.toUpperCase();
            const font = [
              '╔═╗╔═╗╔╦╗╔═╗',
              '╠═╣║ ║ ║ ╠═╣',
              '╩ ╩╚═╝ ╩ ╩ ╩'
            ];
            const lines = [];
            for (let row = 0; row < 3; row++) {
              let line = '';
              for (const char of upper) {
                const code = char.charCodeAt(0) - 65;
                if (code >= 0 && code < 26) {
                  line += font[row].slice(0, 3) + ' ';
                } else if (char === ' ') {
                  line += '   ';
                } else {
                  line += `? `;
                }
              }
              lines.push(line);
            }
            const block = '```\n' + lines.join('\n') + '\n```';
            interaction.reply({ embeds: [createEmbed(`ASCII Art:\n${block}`, 'info')] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};