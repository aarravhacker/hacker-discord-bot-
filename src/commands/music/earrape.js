const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isSlashCommand, addFilter, removeFilter, hasFilter, reapplyCurrentTrack, isPlaying } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('earrape')
    .setDescription('Toggle earrape filter'),
  cooldown: 3,
  aliases: ['loud', 'deafen'],
  prefix: true,
  async execute(interaction, args) {
    if (!isPlaying(interaction.guild.id)) return interaction.reply({ content: 'Nothing is playing!' });

    if (hasFilter(interaction.guild.id, 'earrape')) {
      removeFilter(interaction.guild.id, 'earrape');
      await reapplyCurrentTrack(interaction.guild.id);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Earrape **disabled**')] });
    }

    addFilter(interaction.guild.id, 'earrape');
    await reapplyCurrentTrack(interaction.guild.id);
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x1db954).setDescription('Earrape **enabled**')] });
  }
};
