const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unhideall')
    .setDescription('Unhide all text channels from everyone')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  cooldown: 5,
  aliases: ['unhidechannels', 'unhideallchannels'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const guild = interaction.guild;

      const channels = guild.channels.cache.filter(
        ch => ch.type === ChannelType.GuildText
      );

      let unhidCount = 0;
      for (const [, channel] of channels) {
        try {
          await channel.permissionOverwrites.edit(guild.roles.everyone, {
            ViewChannel: true
          });
          unhidCount++;
        } catch (error) {
          console.error(`Failed to unhide channel ${channel.name}:`, error);
        }
      }

      const embed = successEmbed(`Successfully unhid ${unhidCount} channels.`);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in unhideall command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while unhiding all channels.')],
        ephemeral: true
      });
    }
  }
};
