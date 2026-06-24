const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('execute')
    .setDescription('Execute a shell command (alias)')
    .addStringOption(opt => opt.setName('command').setDescription('Command to execute').setRequired(true)),
  cooldown: 0,
  aliases: [],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
      try {
            const parentCommand = require('./exec');
            return parentCommand.execute(interaction, args);
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};