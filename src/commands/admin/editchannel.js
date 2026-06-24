const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('editchannel')
    .setDescription('Edit a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to edit').setRequired(true))
    .addStringOption(opt => opt.setName('name').setDescription('New name'))
    .addStringOption(opt => opt.setName('topic').setDescription('New topic'))
    .addIntegerOption(opt => opt.setName('slowmode').setDescription('Slowmode in seconds (0 to disable)').setMinValue(0).setMaxValue(21600))
    .addBooleanOption(opt => opt.setName('nsfw').setDescription('Mark as NSFW'))
    .addBooleanOption(opt => opt.setName('pinned').setDescription('Pin the channel')),
  cooldown: 3,
  aliases: ['chupdate', 'updatechannel'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
    if (!channel) return interaction.reply({ embeds: [errorEmbed('Please provide a valid channel.')] });

    const changes = [];
    const updateData = {};

    const name = interaction.options?.getString('name');
    const topic = interaction.options?.getString('topic');
    const slowmode = interaction.options?.getInteger('slowmode');
    const nsfw = interaction.options?.getBoolean('nsfw');

    if (name) { updateData.name = name; changes.push(`Name: **${name}**`); }
    if (topic !== null) { updateData.topic = topic || null; changes.push(`Topic: **${topic || 'cleared'}**`); }
    if (slowmode !== null) { updateData.rateLimitPerUser = slowmode; changes.push(`Slowmode: **${slowmode}s**`); }
    if (nsfw !== null) { updateData.nsfw = nsfw; changes.push(`NSFW: **${nsfw}**`); }

    if (changes.length === 0) return interaction.reply({ embeds: [errorEmbed('Provide at least one field to edit.')] });

    try {
      await channel.edit(updateData);
      await interaction.reply({ embeds: [successEmbed(`Updated ${channel}: ${changes.join(', ')}`)] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to edit channel: ${err.message}`)] });
    }
  }
};
