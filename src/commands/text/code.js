const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('code')
    .setDescription('Format text as inline code')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to format').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['inlinecode'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const text = args?.join(' ') || interaction.options?.getString('text');
            if (!text) {
              return interaction.reply({ embeds: [createEmbed('⚠️ Please provide text.', 'warning')] });
            }
            interaction.reply({ content: `\`${text}\``, allowedMentions: { parse: [] } });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};