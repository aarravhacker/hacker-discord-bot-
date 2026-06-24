const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nsfw')
    .setDescription('Toggle NSFW on a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel').setRequired(true))
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable NSFW').setRequired(true)),
  cooldown: 3,
  aliases: ['togglensfw'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
    const enabled = interaction.options?.getBoolean('enabled') ?? (args?.[1] !== 'false');

    if (!channel) return interaction.reply({ embeds: [errorEmbed('Please provide a valid channel.')] });
    if (!channel.isTextBased()) return interaction.reply({ embeds: [errorEmbed('NSFW can only be toggled on text channels.')] });

    try {
      await channel.setNSFW(enabled);
      await interaction.reply({
        embeds: [successEmbed(`${enabled ? '🔞 NSFW enabled' : '❌ NSFW disabled'} on ${channel}`)]
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to toggle NSFW: ${err.message}`)] });
    }
  }
};
