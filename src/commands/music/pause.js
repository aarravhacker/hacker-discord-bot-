const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const { isSlashCommand, pauseTrack, isPlaying, isPaused } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current song'),
  cooldown: 2,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    try {
      const isSlash = isSlashCommand(interaction);
      if (!isPlaying(interaction.guild.id)) return interaction.reply({ content: 'Nothing is playing!' });
      if (isPaused(interaction.guild.id)) return interaction.reply({ content: 'Music is already paused!' });

      pauseTrack(interaction.guild.id);
      await interaction.reply('Music paused.');
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] }).catch(() => {});
    }
  }
};
