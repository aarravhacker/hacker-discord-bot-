const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isSlashCommand, addFilter, removeFilter, reapplyCurrentTrack, isPlaying } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pitch')
    .setDescription('Change pitch')
    .addNumberOption(opt => opt.setName('pitch').setDescription('Pitch multiplier (0.5-2)').setMinValue(0.5).setMaxValue(2).setRequired(true)),
  cooldown: 3,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    if (!isPlaying(interaction.guild.id)) return interaction.reply({ content: 'Nothing is playing!' });

    const isSlash = isSlashCommand(interaction);
    const pitch = isSlash ? interaction.options?.getNumber('pitch') : parseFloat(args?.[0]);
    if (!pitch || pitch < 0.5 || pitch > 2) return interaction.reply({ content: 'Pitch must be between 0.5 and 2!' });

    if (pitch === 1) {
      removeFilter(interaction.guild.id, 'pitch');
      await reapplyCurrentTrack(interaction.guild.id);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Pitch reset to **1x**')] });
    }

    addFilter(interaction.guild.id, 'pitch', pitch);
    await reapplyCurrentTrack(interaction.guild.id);
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x1db954).setDescription(`Pitch set to **${pitch}x**`)] });
  }
};