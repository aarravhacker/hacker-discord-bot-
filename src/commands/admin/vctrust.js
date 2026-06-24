const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vctrust')
    .setDescription('Trust a user in your temp voice channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to trust').setRequired(true)),

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
    if (trusted.includes(targetUser.id)) {
      embed.setDescription(`${targetUser.tag} is already trusted.`).setColor(0xFEE75C);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    trusted.push(targetUser.id);
    await db('temp_channels')
      .where({ guild_id: guildId, channel_id: member.voice.channelId })
      .update({ trusted_users: JSON.stringify(trusted) });

    // Grant manage channel permissions
    await member.voice.channel.permissionOverwrites.edit(targetUser.id, {
      ManageChannels: true,
      MoveMembers: true,
      MuteMembers: true,
      DeafenMembers: true
    });

    embed
      .setTitle('VC Trust')
      .setDescription(`**${targetUser.tag}** is now trusted in your channel.`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setColor(0x57F287);

    return interaction.reply({ embeds: [embed] });
  },
  adminOnly: true
};
