const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('math')
    .setDescription('Math calculation (alias)')
    .addStringOption(opt => opt.setName('expression').setDescription('Math expression').setRequired(true)),
  cooldown: 3,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            const parentCommand = require('./calc');
            return parentCommand.execute(interaction, args);
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};