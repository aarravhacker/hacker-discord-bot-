const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vclimit')
    .setDescription('Set user limit for your temp voice channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(opt =>
      opt.setName('limit').setDescription('User limit (0 for unlimited)').setRequired(true).setMinValue(0).setMaxValue(99)),

  async execute(interaction) {
    const db = getDB();
    const guildId = interaction.guildId;
    const limit = interaction.options.getInteger('limit');

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
      await member.voice.channel.setUserLimit(limit);
      const displayLimit = limit === 0 ? 'Unlimited' : limit;
      embed
        .setTitle('VC Limit Updated')
        .setDescription(`User limit set to **${displayLimit}**.`)
        .setColor(0x57F287);
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      embed.setDescription(`Failed to set limit: ${err.message}`).setColor(0xED4245);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
  adminOnly: true
};
