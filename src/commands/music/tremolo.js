const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isSlashCommand, addFilter, removeFilter, hasFilter, reapplyCurrentTrack, isPlaying } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('tremolo').setDescription('Toggle tremolo filter'),
  cooldown: 3, aliases: [], prefix: true,
  async execute(interaction, args) {
    if (!isPlaying(interaction.guild.id)) return interaction.reply({ content: 'Nothing is playing!' });
    if (hasFilter(interaction.guild.id, 'tremolo')) {
      removeFilter(interaction.guild.id, 'tremolo');
      await reapplyCurrentTrack(interaction.guild.id);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Tremolo **disabled**')] });
    }
    addFilter(interaction.guild.id, 'tremolo');
    await reapplyCurrentTrack(interaction.guild.id);
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x1db954).setDescription('Tremolo **enabled**')] });
  }
};