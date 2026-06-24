const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');

const monitoredChannels = new Set();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('observer')
    .setDescription('Channel monitoring mode')
    .addStringOption(opt => opt.setName('action').setDescription('Action: add, remove, list, clear'))
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to monitor')),
  cooldown: 0,
  aliases: ['ob'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;

    if (user.id !== config.ownerId) return;

    const action = isSlash ? interaction.options?.getString('action') : args?.[0];
    const channelOpt = isSlash ? interaction.options?.getChannel('channel') : null;

    if (action === 'add') {
      const ch = channelOpt || (args?.[1] ? interaction.guild.channels.cache.get(args[1].replace(/[<>#]/g, '')) : null);
      if (!ch) return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xff0000).setTitle('No Channel').setDescription('Specify a channel to monitor.')
      ] });
      monitoredChannels.add(ch.id);
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0x00ff00).setTitle('Now Monitoring').setDescription(`${ch} is now being observed.`).setTimestamp()
      ] });
    }

    if (action === 'remove') {
      const ch = channelOpt || (args?.[1] ? interaction.guild.channels.cache.get(args[1].replace(/[<>#]/g, '')) : null);
      if (!ch) return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xff0000).setTitle('No Channel').setDescription('Specify a channel to stop monitoring.')
      ] });
      monitoredChannels.delete(ch.id);
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0x00ff00).setTitle('Stopped Monitoring').setDescription(`${ch} is no longer observed.`)
      ] });
    }

    if (action === 'list' || !action) {
      if (!monitoredChannels.size) {
        return interaction.reply({ embeds: [
          new EmbedBuilder().setColor(0x5865f2).setTitle('Observer').setDescription('No channels are being monitored.')
        ] });
      }
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Observer - Monitored Channels')
        .setDescription(Array.from(monitoredChannels).map(id => `<#${id}>`).join('\n'))
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'clear') {
      monitoredChannels.clear();
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0x00ff00).setTitle('Cleared').setDescription('All channels unmonitored.')
      ] });
    }

    return interaction.reply({ embeds: [
      new EmbedBuilder().setColor(0xff0000).setTitle('Invalid Action').setDescription('Use: `add`, `remove`, `list`, `clear`')
    ] });
  }
};

function isChannelMonitored(channelId) {
  return monitoredChannels.has(channelId);
}

module.exports.isChannelMonitored = isChannelMonitored;
