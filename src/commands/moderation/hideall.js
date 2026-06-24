const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hideall')
    .setDescription('Hide all text channels from everyone')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  cooldown: 5,
  aliases: ['hidechannels', 'hideallchannels'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const guild = interaction.guild;

      const channels = guild.channels.cache.filter(
        ch => ch.type === ChannelType.GuildText
      );

      let hiddenCount = 0;
      for (const [, channel] of channels) {
        try {
          await channel.permissionOverwrites.edit(guild.roles.everyone, {
            ViewChannel: false
          });
          hiddenCount++;
        } catch (error) {
          console.error(`Failed to hide channel ${channel.name}:`, error);
        }
      }

      const embed = successEmbed(`Successfully hidden ${hiddenCount} channels.`);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in hideall command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while hiding all channels.')],
        ephemeral: true
      });
    }
  }
};
