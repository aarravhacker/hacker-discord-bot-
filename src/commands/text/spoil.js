const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spoil')
    .setDescription('Wrap text in a spoiler tag')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to spoil').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['spoiler', 'hidden'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const text = args?.join(' ') || interaction.options?.getString('text');
            if (!text) {
              return interaction.reply({ embeds: [createEmbed('⚠️ Please provide text.', 'warning')] });
            }
            interaction.reply({ content: `||${text}||`, allowedMentions: { parse: [] } });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};