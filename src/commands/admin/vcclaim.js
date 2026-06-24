const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vcclaim')
    .setDescription('Claim ownership of the current temp voice channel'),

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

    if (tempChannel.owner_id === member.id) {
      embed.setDescription('You already own this channel.').setColor(0xFEE75C);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await db('temp_channels')
      .where({ guild_id: guildId, channel_id: member.voice.channelId })
      .update({ owner_id: member.id, transferred_at: new Date() });

    embed
      .setTitle('VC Claimed')
      .setDescription(`You are now the owner of **${member.voice.channel.name}**.`)
      .setColor(0x57F287);

    return interaction.reply({ embeds: [embed] });
  },
  adminOnly: true
};
