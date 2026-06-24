const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Shows information about a channel')
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to get info about').setRequired(false)),
  cooldown: 5,
  aliases: ['ci'],
  prefix: true,
  async execute(interaction) {
      try {
            const channel = interaction.options?.getChannel('channel') || interaction.channel;

            const typeMap = {
              [ChannelType.GuildText]: 'Text',
              [ChannelType.GuildVoice]: 'Voice',
              [ChannelType.GuildCategory]: 'Category',
              [ChannelType.GuildAnnouncement]: 'Announcement',
              [ChannelType.GuildStageVoice]: 'Stage',
              [ChannelType.GuildForum]: 'Forum',
              [ChannelType.PublicThread]: 'Thread',
              [ChannelType.PrivateThread]: 'Private Thread',
              [ChannelType.AnnouncementThread]: 'Announcement Thread'
            };

            const embed = new EmbedBuilder()
              .setTitle(channel.name || 'Channel Info')
              .setColor(config.embedColors.info)
              .addFields(
                { name: 'ID', value: channel.id, inline: true },
                { name: 'Type', value: typeMap[channel.type] || 'Unknown', inline: true },
                { name: 'Created', value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:R>`, inline: true }
              );

            if (channel.topic) embed.addFields({ name: 'Topic', value: channel.topic.substring(0, 1024) });
            if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
              embed.addFields(
                { name: 'NSFW', value: channel.nsfw ? 'Yes' : 'No', inline: true },
                { name: 'Slowmode', value: `${channel.rateLimitPerUser || 0}s`, inline: true }
              );
            }
            if (channel.type === ChannelType.GuildVoice) {
              embed.addFields(
                { name: 'Bitrate', value: `${channel.bitrate / 1000}kbps`, inline: true },
                { name: 'User Limit', value: channel.userLimit === 0 ? 'Unlimited' : `${channel.userLimit}`, inline: true }
              );
            }

            embed.setTimestamp();
            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};