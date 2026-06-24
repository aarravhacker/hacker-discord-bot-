const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const { getShoukaku, isSlashCommand } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prev')
    .setDescription('Play the previous song (alias)'),
  cooldown: 2,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            await interaction.reply({ content: '⏮️ Previous track is not available in Shoukaku v4.' });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] }).catch(() => {});
      }
  }
};