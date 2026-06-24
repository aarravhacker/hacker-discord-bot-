const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vote')
    .setDescription('Vote on a poll (alias)')
    .addStringOption(opt => opt.setName('messageid').setDescription('Poll message ID').setRequired(true))
    .addIntegerOption(opt => opt.setName('option').setDescription('Option number to vote for').setRequired(true)),
  cooldown: 3,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            const parentCommand = require('./pollvote');
            return parentCommand.execute(interaction, args);
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};