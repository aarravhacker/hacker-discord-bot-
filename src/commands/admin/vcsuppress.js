const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vcsuppress')
    .setDescription('Suppress a user in your temp voice channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to suppress').setRequired(true)),

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

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember || !targetMember.voice.channel || targetMember.voice.channelId !== member.voice.channelId) {
      embed.setDescription('That user is not in your voice channel.').setColor(0xFEE75C);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      await member.voice.channel.permissionOverwrites.edit(targetUser.id, { Speak: false });
      embed
        .setTitle('VC Suppress')
        .setDescription(`Suppressed **${targetUser.tag}**. They cannot speak.`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setColor(0xED4245);
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      embed.setDescription(`Failed to suppress user: ${err.message}`).setColor(0xED4245);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
  adminOnly: true
};
