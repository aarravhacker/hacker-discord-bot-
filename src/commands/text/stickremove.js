const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stickremove')
    .setDescription('Remove a sticky message from a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('The channel to remove the sticky from')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const db = getDB();
    const result = db.prepare('DELETE FROM stickies WHERE guild_id = ? AND channel_id = ?').run(interaction.guild.id, channel.id);

    if (result.changes === 0) {
      return interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription(`No sticky message found in <#${channel.id}>.`)] });
    }

    return interaction.reply({ embeds: [new EmbedBuilder()
      .setColor(0x00ff00)
      .setDescription(`Sticky message removed from <#${channel.id}>.`)] });
  },

  prefix: {
    name: 'stickremove',
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
          .setDescription('Usage: `!stickremove <channel>`')] });
      }

      const db = getDB();
      const result = db.prepare('DELETE FROM stickies WHERE guild_id = ? AND channel_id = ?').run(message.guild.id, channel.id);

      if (result.changes === 0) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription(`No sticky message found in <#${channel.id}>.`)] });
      }

      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x00ff00)
        .setDescription(`Sticky message removed from <#${channel.id}>.`)] });
    }
  }
};
