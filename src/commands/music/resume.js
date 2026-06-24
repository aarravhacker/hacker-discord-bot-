const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const { isSlashCommand, resumeTrack, isPaused } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the current song'),
  cooldown: 2,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    try {
      const isSlash = isSlashCommand(interaction);
      if (!isPaused(interaction.guild.id)) return interaction.reply({ content: 'Music is not paused!' });

      resumeTrack(interaction.guild.id);
      await interaction.reply('Music resumed.');
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] }).catch(() => {});
    }
  }
};
