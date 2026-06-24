const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Set the welcome channel and message')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Welcome channel').addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .addStringOption(opt => opt.setName('message').setDescription('Welcome message (use {user}, {server}, {count})')),
  cooldown: 5,
  aliases: ['setwelcomemsg', 'welcomeconfig'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
            if (!channel) return interaction.reply({ embeds: [errorEmbed('Please provide a valid text channel.')] });

            const message = interaction.options?.getString('message') || args?.slice(1).join(' ');

            const updates = { welcomeChannelId: channel.id };
            if (message) updates.welcomeMessage = message;

            await updateGuild(interaction.guild.id, updates);

            const response = `Welcome channel set to ${channel}`;
            if (message) response += `\nWelcome message: ${message.slice(0, 1024)}`;
            response += '\n\nPlaceholders: `{user}`, `{server}`, `{count}`';

            await interaction.reply({ embeds: [successEmbed(response)] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};