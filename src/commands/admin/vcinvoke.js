const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vcinvoke')
    .setDescription('Show voice settings for your temp channel'),

  async execute(interaction) {
    const db = getDB();
    const guildId = interaction.guildId;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTimestamp();

    const member = interaction.member;
    if (!member.voice.channel) {
      embed.setDescription('You must be in a voice channel.').setColor(0xFEE75C);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const tempChannel = await db('temp_channels')
      .where({ guild_id: guildId, channel_id: member.voice.channelId })
      .first();

    if (!tempChannel) {
      embed.setDescription('This is not a temp voice channel.').setColor(0xFEE75C);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const channel = member.voice.channel;
    const bitrate = channel.bitrate / 1000;
    const userLimit = channel.userLimit || 'Unlimited';
    const owner = await interaction.guild.members.fetch(tempChannel.owner_id).catch(() => null);

    const perms = channel.permissionFor(interaction.guild.roles.everyone);
    const isHidden = perms && !perms.has('ViewChannel');
    const isLocked = perms && perms.has('Connect') === false;

    embed
      .setTitle('VC Invoke - Voice Settings')
      .setDescription(`Settings for **${channel.name}**`)
      .addFields(
        { name: 'Owner', value: owner ? owner.user.tag : 'Unknown', inline: true },
        { name: 'Bitrate', value: `${bitrate}kbps`, inline: true },
        { name: 'User Limit', value: `${userLimit}`, inline: true },
        { name: 'Hidden', value: isHidden ? '`Yes`' : '`No`', inline: true },
        { name: 'Locked', value: isLocked ? '`Yes`' : '`No`', inline: true },
        { name: 'Members', value: `${channel.members.size}`, inline: true }
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
  adminOnly: true
};
