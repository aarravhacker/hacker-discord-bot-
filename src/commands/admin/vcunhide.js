const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vcunhide')
    .setDescription('Unhide your temp voice channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

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
      .where({ guild_id: guildId, channel_id: member.voice.channelId, owner_id: member.id })
      .first();

    if (!tempChannel) {
      embed.setDescription('You do not own this temp channel.').setColor(0xFEE75C);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const everyone = interaction.guild.roles.everyone;
    await member.voice.channel.permissionOverwrites.edit(everyone, { ViewChannel: null });

    embed
      .setTitle('VC Unhidden')
      .setDescription(`**${member.voice.channel.name}** is now visible in the channel list.`)
      .setColor(0x57F287);

    return interaction.reply({ embeds: [embed] });
  },
  adminOnly: true
};
