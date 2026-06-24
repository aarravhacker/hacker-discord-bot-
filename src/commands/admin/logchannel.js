const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logchannel')
    .setDescription('View or set the log channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('New log channel (omit to view)').addChannelTypes(ChannelType.GuildText)
    ),
  cooldown: 3,
  aliases: ['getlog', 'showlog'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);

            if (channel) {
              await updateGuild(interaction.guild.id, { logChannelId: channel.id });
              return interaction.reply({ embeds: [successEmbed(`Log channel set to ${channel}`)] });
            }

            const guildData = await getGuild(interaction.guild.id);
            const current = guildData.logChannelId ? `<#${guildData.logChannelId}>` : 'Not set';
            return interaction.reply({ embeds: [infoEmbed(`Current log channel: ${current}`)] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};