const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pfp')
    .setDescription('Get profile picture (alias)')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(false)),
  cooldown: 3,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            const parentCommand = require('./avatar');
            return parentCommand.execute(interaction, args);
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};