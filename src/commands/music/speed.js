const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isSlashCommand, addFilter, removeFilter, hasFilter, reapplyCurrentTrack, isPlaying } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('speed')
    .setDescription('Change playback speed')
    .addNumberOption(opt => opt.setName('speed').setDescription('Speed multiplier (0.5-3)').setMinValue(0.5).setMaxValue(3).setRequired(true)),
  cooldown: 3,
  aliases: ['slow', 'fast'],
  prefix: true,
  async execute(interaction, args) {
    if (!isPlaying(interaction.guild.id)) return interaction.reply({ content: 'Nothing is playing!' });

    const speed = isSlash ? interaction.options?.getNumber('speed') : parseFloat(args?.[0]);
    if (!speed || speed < 0.5 || speed > 3) return interaction.reply({ content: 'Speed must be between 0.5 and 3!' });

    if (speed === 1) {
      removeFilter(interaction.guild.id, 'speed');
      await reapplyCurrentTrack(interaction.guild.id);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Speed reset to **1x**')] });
    }

    addFilter(interaction.guild.id, 'speed', speed);
    await reapplyCurrentTrack(interaction.guild.id);
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x1db954).setDescription(`Speed set to **${speed}x**`)] });
  }
};