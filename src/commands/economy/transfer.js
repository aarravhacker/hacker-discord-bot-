const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transfer')
    .setDescription('Transfer money (alias)')
    .addUserOption(opt => opt.setName('user').setDescription('User to pay').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setRequired(true)),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            const parentCommand = require('./pay');
            return parentCommand.execute(interaction, args);
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};