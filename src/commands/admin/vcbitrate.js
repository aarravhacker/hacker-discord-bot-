const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vcbitrate')
    .setDescription('Set voice bitrate for your temp channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(opt =>
      opt.setName('bitrate').setDescription('Bitrate in kbps (8-384)').setRequired(true).setMinValue(8).setMaxValue(384)),

  async execute(interaction) {
    const db = getDB();
    const guildId = interaction.guildId;
    const bitrate = interaction.options.getInteger('bitrate');

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTimestamp();

    const member = interaction.member;
    if (!member.voice.channel) {
      embed.setDescription('You must be in a voice channel to use this command.').setColor(0xFEE75C);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const tempChannel = await db('temp_channels')
      .where({ guild_id: guildId, channel_id: member.voice.channelId, owner_id: member.id })
      .first();

    if (!tempChannel) {
      embed.setDescription('You do not own this temp channel.').setColor(0xFEE75C);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const guildBoostLevel = interaction.guild.premiumTier;
    const maxBitrate = [96, 128, 256, 384][guildBoostLevel] || 96;
    if (bitrate > maxBitrate) {
      embed.setDescription(`Bitrate cannot exceed **${maxBitrate}kbps** at this boost level (${guildBoostLevel}).`).setColor(0xFEE75C);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      await member.voice.channel.setBitrate(bitrate * 1000);
      embed
        .setTitle('Bitrate Updated')
        .setDescription(`Voice channel bitrate set to **${bitrate}kbps**.`)
        .setColor(0x57F287);
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      embed.setDescription(`Failed to update bitrate: ${err.message}`).setColor(0xED4245);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
  adminOnly: true
};
