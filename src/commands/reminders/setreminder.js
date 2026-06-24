const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setreminder')
    .setDescription('Set a reminder (alias)')
    .addStringOption(opt => opt.setName('time').setDescription('Time (e.g., 10m, 2h, 1d)').setRequired(true))
    .addStringOption(opt => opt.setName('message').setDescription('Reminder message').setRequired(true)),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            const parentCommand = require('./remind');
            return parentCommand.execute(interaction, args);
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};