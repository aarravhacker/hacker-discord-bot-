const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const logger = require('../../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilinkrate')
    .setDescription('Rate limit links per channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set link rate limit for a channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to limit').setRequired(true))
        .addIntegerOption(opt => opt.setName('max').setDescription('Max links per minute (1-50)').setRequired(true).setMinValue(1).setMaxValue(50))
        .addStringOption(opt => opt.setName('action').setDescription('Action when exceeded').addChoices(
          { name: 'delete', value: 'delete' }, { name: 'warn', value: 'warn' }, { name: 'mute', value: 'mute' }, { name: 'kick', value: 'kick' })))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove rate limit from a channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to unlimit').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List all channel rate limits'))
    .addSubcommand(sub =>
      sub.setName('global')
        .setDescription('Set global link rate limit')
        .addIntegerOption(opt => opt.setName('max').setDescription('Max links per minute globally (1-50)').setRequired(true).setMinValue(1).setMaxValue(50)))
    .addSubcommand(sub =>
      sub.setName('status').setDescription('View link rate limit status')),

  cooldown: 5,
  aliases: ['alrate', 'linkrate'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permission.', ephemeral: true });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'list').toLowerCase();
    const guildData = await getGuild(interaction.guild.id);
    const config = JSON.parse(guildData.antilink_config || '{}');
    if (!config.channelRateLimits) config.channelRateLimits = {};

    if (subcommand === 'set') {
      const channel = isSlash ? interaction.options.getChannel('channel') : null;
      const max = isSlash ? interaction.options.getInteger('max') : parseInt(args[1]) || 5;
      const action = isSlash ? interaction.options.getString('action') : args[2] || 'delete';
      if (!channel) return interaction.reply({ content: 'Provide a channel.', ephemeral: true });

      config.channelRateLimits[channel.id] = { max, action, setBy: user.id };
      config.blockInvites = true;
      config.blockUrls = true;
      await updateGuild(interaction.guild.id, { antilink_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`<#${channel.id}> rate limited to **${max}** links/minute. Action: **${action}**`)] });
    }

    if (subcommand === 'remove') {
      const channel = isSlash ? interaction.options.getChannel('channel') : null;
      if (!channel) return interaction.reply({ content: 'Provide a channel.', ephemeral: true });
      delete config.channelRateLimits[channel.id];
      await updateGuild(interaction.guild.id, { antilink_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Rate limit removed from <#${channel.id}>.`)] });
    }

    if (subcommand === 'list') {
      const limits = config.channelRateLimits || {};
      const entries = Object.entries(limits);
      const embed = new EmbedBuilder()
        .setColor(entries.length > 0 ? 0x0099ff : 0x00ff00)
        .setTitle('Link Rate Limits')
        .setDescription(entries.length > 0 ? entries.map(([id, l]) => `<#${id}>: **${l.max}** links/min (${l.action})`).join('\n') : 'No rate limits configured.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'global') {
      const max = isSlash ? interaction.options.getInteger('max') : parseInt(args[0]) || 10;
      config.globalRateLimit = max;
      await updateGuild(interaction.guild.id, { antilink_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Global link rate limit set to **${max}** links/minute per user.`)] });
    }

    if (subcommand === 'status') {
      const limits = config.channelRateLimits || {};
      const global = config.globalRateLimit || 'Not set';
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Link Rate Limit Status')
        .addFields(
          { name: 'Global Limit', value: `${global} links/min`, inline: true },
          { name: 'Channel Limits', value: `${Object.keys(limits).length} configured`, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};
