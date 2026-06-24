const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isSlashCommand, addFilter, removeFilter, hasFilter, reapplyCurrentTrack, isPlaying } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('karaoke').setDescription('Toggle karaoke filter'),
  cooldown: 3, aliases: [], prefix: true,
  async execute(interaction, args) {
    if (!isPlaying(interaction.guild.id)) return interaction.reply({ content: 'Nothing is playing!' });
    if (hasFilter(interaction.guild.id, 'karaoke')) {
      removeFilter(interaction.guild.id, 'karaoke');
      await reapplyCurrentTrack(interaction.guild.id);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Karaoke **disabled**')] });
    }
    addFilter(interaction.guild.id, 'karaoke');
    await reapplyCurrentTrack(interaction.guild.id);
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x1db954).setDescription('Karaoke **enabled**')] });
  }
};