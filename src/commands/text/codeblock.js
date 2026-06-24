const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('codeblock')
    .setDescription('Format text as a code block')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to format').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('language').setDescription('Language for syntax highlighting').setRequired(false)
    ),
  cooldown: 3,
  aliases: ['cb', 'codeblock'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const text = args?.join(' ') || interaction.options?.getString('text');
            const language = interaction.options?.getString('language') || '';
            if (!text) {
              return interaction.reply({ embeds: [createEmbed('⚠️ Please provide text.', 'warning')] });
            }
            interaction.reply({ content: `\`\`\`${language}\n${text}\n\`\`\``, allowedMentions: { parse: [] } });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};