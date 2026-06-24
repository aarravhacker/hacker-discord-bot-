const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vcchat')
    .setDescription('Enable or disable text chat in your voice channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt =>
      opt.setName('toggle').setDescription('Enable or disable').setRequired(true)
        .addChoices(
          { name: 'Enable', value: 'enable' },
          { name: 'Disable', value: 'disable' }
        )),

  async execute(interaction) {
    const db = getDB();
    const guildId = interaction.guildId;
    const toggle = interaction.options.getString('toggle');

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

    const channel = member.voice.channel;
    const everyone = interaction.guild.roles.everyone;

    if (toggle === 'enable') {
      await channel.permissionOverwrites.edit(everyone, { SendMessages: null, AddReactions: null });
      embed.setTitle('VC Chat Enabled').setDescription('Text chat is now **enabled** in your voice channel.').setColor(0x57F287);
    } else {
      await channel.permissionOverwrites.edit(everyone, { SendMessages: false, AddReactions: false });
      embed.setTitle('VC Chat Disabled').setDescription('Text chat is now **disabled** in your voice channel.').setColor(0xED4245);
    }

    return interaction.reply({ embeds: [embed] });
  },
  adminOnly: true
};
