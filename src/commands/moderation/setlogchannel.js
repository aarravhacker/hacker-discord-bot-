const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { updateGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlogchannel')
    .setDescription('Set the general log channel')
    .addChannelOption(option => option.setName('channel').setDescription('The channel for logs').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 10,
  aliases: ['slc'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const channel = isSlash ? interaction.options?.getChannel('channel') : interaction.guild.channels.cache.get(args?.[0]?.replace(/[<>#]/g, ''));

    if (!channel) return interaction.reply({ embeds: [errorEmbed('Please provide a valid channel.')] });
    if (!channel.isTextBased()) return interaction.reply({ embeds: [errorEmbed('The channel must be a text channel.')] });

    try {
      await updateGuild(interaction.guild.id, { log_channel: channel.id });

      return interaction.reply({ embeds: [successEmbed(`Successfully set the log channel to ${channel}.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while setting the log channel.')] });
    }
  }
};
