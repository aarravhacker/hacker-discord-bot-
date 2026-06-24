const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isSlashCommand, getShoukaku, addFilter, removeFilter, hasFilter, getFilters, reapplyCurrentTrack, isPlaying, getQueue } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bassboost')
    .setDescription('Toggle bassboost filter')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Bass amount (1-20)').setMinValue(1).setMaxValue(20)),
  cooldown: 3,
  aliases: ['bb'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = isSlashCommand(interaction);
    if (!isPlaying(interaction.guild.id)) return interaction.reply({ content: 'Nothing is playing!' });

    const amount = isSlash ? (interaction.options?.getInteger('amount') || 10) : (parseInt(args?.[0]) || 10);

    if (hasFilter(interaction.guild.id, 'bassboost')) {
      removeFilter(interaction.guild.id, 'bassboost');
      await reapplyCurrentTrack(interaction.guild.id);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`Bassboost **disabled**`)] });
    }

    addFilter(interaction.guild.id, 'bassboost', amount);
    await reapplyCurrentTrack(interaction.guild.id);
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x1db954).setDescription(`Bassboost **enabled** (amount: ${amount})`)] });
  }
};