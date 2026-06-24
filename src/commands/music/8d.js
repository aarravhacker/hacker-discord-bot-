const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isSlashCommand, addFilter, removeFilter, hasFilter, reapplyCurrentTrack, isPlaying } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8d')
    .setDescription('Toggle 8D audio filter'),
  cooldown: 3,
  aliases: ['8daudio'],
  prefix: true,
  async execute(interaction, args) {
    if (!isPlaying(interaction.guild.id)) return interaction.reply({ content: 'Nothing is playing!' });

    if (hasFilter(interaction.guild.id, '8d')) {
      removeFilter(interaction.guild.id, '8d');
      await reapplyCurrentTrack(interaction.guild.id);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('8D Audio **disabled**')] });
    }

    addFilter(interaction.guild.id, '8d');
    await reapplyCurrentTrack(interaction.guild.id);
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x1db954).setDescription('8D Audio **enabled**')] });
  }
};