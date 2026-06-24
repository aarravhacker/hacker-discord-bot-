const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vctransfer')
    .setDescription('Transfer ownership of your temp voice channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to transfer ownership to').setRequired(true)),

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

    if (targetUser.id === interaction.user.id) {
      embed.setDescription('You already own this channel.').setColor(0xFEE75C);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      embed.setDescription('User not found in this server.').setColor(0xFEE75C);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await db('temp_channels')
      .where({ guild_id: guildId, channel_id: member.voice.channelId })
      .update({ owner_id: targetUser.id, transferred_at: new Date() });

    embed
      .setTitle('VC Transferred')
      .setDescription(`Ownership of **${member.voice.channel.name}** transferred to ${targetUser.tag}.`)
      .addFields(
        { name: 'From', value: interaction.user.tag, inline: true },
        { name: 'To', value: targetUser.tag, inline: true }
      )
      .setColor(0x57F287);

    return interaction.reply({ embeds: [embed] });
  },
  adminOnly: true
};
