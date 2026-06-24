const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scale')
    .setDescription('Scale an image (alias)')
    .addAttachmentOption(opt => opt.setName('image').setDescription('Image').setRequired(true))
    .addIntegerOption(opt => opt.setName('width').setDescription('Width').setRequired(true))
    .addIntegerOption(opt => opt.setName('height').setDescription('Height').setRequired(true)),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            const parentCommand = require('./resize');
            return parentCommand.execute(interaction, args);
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};