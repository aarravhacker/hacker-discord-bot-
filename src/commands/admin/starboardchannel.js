const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('starboardchannel')
    .setDescription('View or set the starboard channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Starboard channel (omit to view)').addChannelTypes(ChannelType.GuildText)
    ),
  cooldown: 3,
  aliases: ['starboardch', 'setstarboardch'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);

            if (channel) {
              await updateGuild(interaction.guild.id, { starboardChannelId: channel.id });
              return interaction.reply({ embeds: [successEmbed(`Starboard channel set to ${channel}`)] });
            }

            const guildData = await getGuild(interaction.guild.id);
            const current = guildData.starboardChannelId ? `<#${guildData.starboardChannelId}>` : 'Not set';
            return interaction.reply({ embeds: [infoEmbed(`Current starboard channel: ${current}`)] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};