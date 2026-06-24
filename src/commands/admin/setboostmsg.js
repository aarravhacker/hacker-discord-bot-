const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setboostmsg')
    .setDescription('Set the boost announcement channel and message')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Boost channel').addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption(opt => opt.setName('message').setDescription('Boost message (use {user}, {server}, {boosts})')),
  cooldown: 5,
  aliases: ['boostconfig', 'setboost'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
            const message = interaction.options?.getString('message') || args?.slice(1).join(' ');

            const updates = {};
            if (channel) updates.boostChannelId = channel.id;
            if (message) updates.boostMessage = message;

            if (Object.keys(updates).length === 0) {
              return interaction.reply({ embeds: [errorEmbed('Provide at least a channel or message.')] });
            }

            await updateGuild(interaction.guild.id, updates);

            const response = [];
            if (channel) response.push(`Boost channel: ${channel}`);
            if (message) response.push(`Boost message: ${message.slice(0, 1024)}`);
            response.push('\nPlaceholders: `{user}`, `{server}`, `{boosts}`');

            await interaction.reply({ embeds: [successEmbed(`Boost message configured!\n${response.join('\n')}`)] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};