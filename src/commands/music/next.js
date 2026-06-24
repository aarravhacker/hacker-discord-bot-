const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const { isSlashCommand, getQueue, playTrack, stopPlayback, isPlaying } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('next')
    .setDescription('Skip to the next song (alias)'),
  cooldown: 2,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    try {
      const isSlash = isSlashCommand(interaction);
      if (!isPlaying(interaction.guild.id)) return interaction.reply({ content: 'Nothing is playing!' });

      const queue = getQueue(interaction.guild.id);
      const nextTrack = queue.next();
      if (nextTrack) {
        await playTrack(interaction.guild.id, nextTrack);
        queue.current = nextTrack;
        await interaction.reply('Skipped to next song.');
      } else {
        stopPlayback(interaction.guild.id);
        await interaction.reply('Skipped. No more songs in queue.');
      }
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] }).catch(() => {});
    }
  }
};
