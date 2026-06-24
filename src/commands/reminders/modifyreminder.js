const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modifyreminder')
    .setDescription('Modify a reminder (alias)')
    .addIntegerOption(opt => opt.setName('id').setDescription('Reminder number').setRequired(true))
    .addStringOption(opt => opt.setName('time').setDescription('New time').setRequired(true))
    .addStringOption(opt => opt.setName('message').setDescription('New message').setRequired(true)),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            const parentCommand = require('./editreminder');
            return parentCommand.execute(interaction, args);
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};