const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isSlashCommand, addFilter, removeFilter, hasFilter, reapplyCurrentTrack, isPlaying } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nightcore')
    .setDescription('Toggle nightcore filter'),
  cooldown: 3,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    if (!isPlaying(interaction.guild.id)) return interaction.reply({ content: 'Nothing is playing!' });

    if (hasFilter(interaction.guild.id, 'nightcore')) {
      removeFilter(interaction.guild.id, 'nightcore');
      await reapplyCurrentTrack(interaction.guild.id);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Nightcore **disabled**')] });
    }

    addFilter(interaction.guild.id, 'nightcore');
    await reapplyCurrentTrack(interaction.guild.id);
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x1db954).setDescription('Nightcore **enabled**')] });
  }
};
