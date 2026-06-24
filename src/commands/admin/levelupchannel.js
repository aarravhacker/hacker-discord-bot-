const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levelupchannel')
    .setDescription('View or set the level-up channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Level-up channel (omit to view)').addChannelTypes(ChannelType.GuildText)
    ),
  cooldown: 3,
  aliases: ['lvlch', 'setlvlch'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);

            if (channel) {
              await updateGuild(interaction.guild.id, { levelUpChannelId: channel.id });
              return interaction.reply({ embeds: [successEmbed(`Level-up channel set to ${channel}`)] });
            }

            const guildData = await getGuild(interaction.guild.id);
            const current = guildData.levelUpChannelId ? `<#${guildData.levelUpChannelId}>` : 'Not set (messages appear in chat)';
            return interaction.reply({ embeds: [infoEmbed(`Current level-up channel: ${current}`)] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};