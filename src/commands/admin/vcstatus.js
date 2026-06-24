const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vcstatus')
    .setDescription('Show info about your temp voice channel'),

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

    const trusted = tempChannel.trusted_users ? JSON.parse(tempChannel.trusted_users) : [];
    const trustedList = trusted.length > 0
      ? trusted.map(id => `<@${id}>`).join(', ')
      : 'None';

    const memberList = channel.members.size > 0
      ? channel.members.map(m => `<@${m.id}>`).join(', ')
      : 'Empty';

    embed
      .setTitle('VC Status')
      .setDescription(`Info for **${channel.name}**`)
      .addFields(
        { name: 'Owner', value: owner ? owner.user.tag : 'Unknown', inline: true },
        { name: 'Created', value: `<t:${Math.floor(new Date(tempChannel.created_at).getTime() / 1000)}:R>`, inline: true },
        { name: 'Bitrate', value: `${bitrate}kbps`, inline: true },
        { name: 'User Limit', value: `${userLimit}`, inline: true },
        { name: 'Hidden', value: isHidden ? '`Yes`' : '`No`', inline: true },
        { name: 'Locked', value: isLocked ? '`Yes`' : '`No`', inline: true },
        { name: 'Members', value: memberList, inline: false },
        { name: 'Trusted', value: trustedList, inline: false }
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
  adminOnly: true
};
