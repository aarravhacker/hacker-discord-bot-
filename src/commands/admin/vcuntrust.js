const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vcuntrust')
    .setDescription('Untrust a user in your temp voice channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to untrust').setRequired(true)),

  async execute(interaction) {
    const db = getDB();
    const guildId = interaction.guildId;
    const targetUser = interaction.options.getUser('user');

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTimestamp();

    const member = interaction.member;
    if (!member.voice.channel) {
      embed.setDescription('You must be in a voice channel.').setColor(0xFEE75C);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const tempChannel = await db('temp_channels')
      .where({ guild_id: guildId, channel_id: member.voice.channelId, owner_id: member.id })
      .first();

    if (!tempChannel) {
      embed.setDescription('You do not own this temp channel.').setColor(0xFEE75C);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const trusted = tempChannel.trusted_users ? JSON.parse(tempChannel.trusted_users) : [];
    if (!trusted.includes(targetUser.id)) {
      embed.setDescription(`${targetUser.tag} is not trusted.`).setColor(0xFEE75C);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const updated = trusted.filter(id => id !== targetUser.id);
    await db('temp_channels')
      .where({ guild_id: guildId, channel_id: member.voice.channelId })
      .update({ trusted_users: JSON.stringify(updated) });

    // Remove manage channel permissions
    await member.voice.channel.permissionOverwrites.edit(targetUser.id, {
      ManageChannels: false,
      MoveMembers: false,
      MuteMembers: false,
      DeafenMembers: false
    });

    embed
      .setTitle('VC Untrust')
      .setDescription(`**${targetUser.tag}** is no longer trusted in your channel.`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setColor(0xED4245);

    return interaction.reply({ embeds: [embed] });
  },
  adminOnly: true
};
