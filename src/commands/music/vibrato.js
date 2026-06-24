const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isSlashCommand, addFilter, removeFilter, hasFilter, reapplyCurrentTrack, isPlaying } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('vibrato').setDescription('Toggle vibrato filter'),
  cooldown: 3, aliases: [], prefix: true,
  async execute(interaction, args) {
    if (!isPlaying(interaction.guild.id)) return interaction.reply({ content: 'Nothing is playing!' });
    if (hasFilter(interaction.guild.id, 'vibrato')) {
      removeFilter(interaction.guild.id, 'vibrato');
      await reapplyCurrentTrack(interaction.guild.id);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Vibrato **disabled**')] });
    }
    addFilter(interaction.guild.id, 'vibrato');
    await reapplyCurrentTrack(interaction.guild.id);
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x1db954).setDescription('Vibrato **enabled**')] });
  }
};