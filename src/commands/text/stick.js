const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stick')
    .setDescription('Add a sticky message to a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('The channel to make sticky')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('message')
        .setDescription('The sticky message content')
        .setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('interval')
        .setDescription('Interval in seconds between repeats (default 60)')
        .setMinValue(10)
        .setMaxValue(86400)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const messageText = interaction.options.getString('message');
    const interval = interaction.options.getInteger('interval') || 60;

    const db = getDB();
    const existing = db.prepare('SELECT * FROM stickies WHERE guild_id = ? AND channel_id = ?').get(interaction.guild.id, channel.id);

    if (existing) {
      return interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription(`A sticky message already exists in <#${channel.id}>. Remove it first with \`/stickremove\`.`)] });
    }

    db.prepare('INSERT INTO stickies (guild_id, channel_id, message, interval_seconds, enabled) VALUES (?, ?, ?, ?, 1)').run(interaction.guild.id, channel.id, messageText, interval);

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('Sticky Message Added')
      .addFields(
        { name: 'Channel', value: `<#${channel.id}>`, inline: true },
        { name: 'Interval', value: `${interval}s`, inline: true },
        { name: 'Message', value: messageText.substring(0, 1024) }
      );

    return interaction.reply({ embeds: [embed] });
  },

  prefix: {
    name: 'stick',
    async execute(message, args) {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(0xff0000)
          .setDescription('You need the Manage Messages permission to use this command.')] });
      }

      const channel = message.mentions.channels.first();
      if (!channel) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(0xff0000)
          .setDescription('Usage: `!stick <channel> <message> [interval]`')] });
      }

      const argsArray = message.content.split(' ').slice(1);
      const channelMentionIndex = argsArray.findIndex(a => a === `<#${channel.id}>`);
      const parts = argsArray.slice(channelMentionIndex + 1);

      if (!parts.length) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(0xff0000)
          .setDescription('Usage: `!stick <channel> <message> [interval]`')] });
      }

      const lastPart = parts[parts.length - 1];
      let interval = 60;
      let messageText;

      if (/^\d+$/.test(lastPart) && parseInt(lastPart) >= 10 && parseInt(lastPart) <= 86400) {
        interval = parseInt(lastPart);
        messageText = parts.slice(0, -1).join(' ');
      } else {
        messageText = parts.join(' ');
      }

      if (!messageText) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(0xff0000)
          .setDescription('You must provide a message.')] });
      }

      const db = getDB();
      const existing = db.prepare('SELECT * FROM stickies WHERE guild_id = ? AND channel_id = ?').get(message.guild.id, channel.id);

      if (existing) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(0xff0000)
          .setDescription(`A sticky message already exists in <#${channel.id}>. Remove it first with \`!stickremove\`.`)] });
      }

      db.prepare('INSERT INTO stickies (guild_id, channel_id, message, interval_seconds, enabled) VALUES (?, ?, ?, ?, 1)').run(message.guild.id, channel.id, messageText, interval);

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('Sticky Message Added')
        .addFields(
          { name: 'Channel', value: `<#${channel.id}>`, inline: true },
          { name: 'Interval', value: `${interval}s`, inline: true },
          { name: 'Message', value: messageText.substring(0, 1024) }
        );

      return message.reply({ embeds: [embed] });
    }
  }
};
