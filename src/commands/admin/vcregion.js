const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

const REGIONS = ['brazil', 'europe', 'india', 'japan', 'russia', 'singapore', 'southafrica', 'sydney', 'us-central', 'us-east', 'us-south', 'us-west'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vcregion')
    .setDescription('Set voice region for your temp channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt =>
      opt.setName('region').setDescription('Voice region').setRequired(true)
        .addChoices(...REGIONS.map(r => ({ name: r, value: r }))),
    ),

  cooldown: 5,
  aliases: ['vcregion'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const db = getDB();
    const guildId = interaction.guildId;
    const region = interaction.options.getString('region');

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

    try {
      await member.voice.channel.setRTCRegion(region);
      embed
        .setTitle('VC Region Updated')
        .setDescription(`Voice region set to **${region}**.`)
        .setColor(0x57F287);
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      embed.setDescription(`Failed to set region: ${err.message}`).setColor(0xED4245);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
