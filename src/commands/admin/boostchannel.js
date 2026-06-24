const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boostchannel')
    .setDescription('View or set the boost announcement channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Boost channel (omit to view)').addChannelTypes(ChannelType.GuildText)
    ),
  cooldown: 3,
  aliases: ['setboostch'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);

            if (channel) {
              await updateGuild(interaction.guild.id, { boostChannelId: channel.id });
              return interaction.reply({ embeds: [successEmbed(`Boost channel set to ${channel}`)] });
            }

            const guildData = await getGuild(interaction.guild.id);
            const current = guildData.boostChannelId ? `<#${guildData.boostChannelId}>` : 'Not set';
            return interaction.reply({ embeds: [infoEmbed(`Current boost channel: ${current}`)] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};