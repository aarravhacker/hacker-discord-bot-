const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('createchannel')
    .setDescription('Create a new channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName('name').setDescription('Channel name').setRequired(true))
    .addChannelOption(opt =>
      opt.setName('category')
        .setDescription('Category to place it in')
        .addChannelTypes(ChannelType.GuildCategory)
    )
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Channel type (text, voice, announcement, stage, forum)')
        .setRequired(false)
    ),
  cooldown: 3,
  aliases: ['chcreate', 'addchannel'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const name = interaction.options?.getString('name') || args?.[0];
    if (!name) return interaction.reply({ embeds: [errorEmbed('Please provide a channel name.')] });

    const category = interaction.options?.getChannel('category');
    const typeChoice = interaction.options?.getString('type') || args?.[1] || 'text';

    const typeMap = {
      text: ChannelType.GuildText,
      voice: ChannelType.GuildVoice,
      announcement: ChannelType.GuildAnnouncement,
      stage: ChannelType.GuildStageVoice,
      forum: ChannelType.GuildForum
    };

    const channelType = typeMap[typeChoice] || ChannelType.GuildText;

    try {
      const channel = await interaction.guild.channels.create({
        name,
        type: channelType,
        parent: category?.id || null
      });
      await interaction.reply({
        embeds: [successEmbed(`Created channel ${channel} (${channelType})`)]
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to create channel: ${err.message}`)] });
    }
  }
};
