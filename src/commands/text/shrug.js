const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shrug')
    .setDescription('Add the shrug emoticon to your message')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text before shrug').setRequired(false)
    ),
  cooldown: 3,
  aliases: ['¯\\_(ツ)_/¯'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const text = args?.join(' ') || interaction.options?.getString('text') || '';
            const result = text ? `${text} ¯\\_(ツ)_/¯` : '¯\\_(ツ)_/¯';
            interaction.reply({ content: result, allowedMentions: { parse: [] } });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};