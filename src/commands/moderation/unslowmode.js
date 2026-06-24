const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unslowmode')
    .setDescription('Remove slowmode from the channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  cooldown: 5,
  aliases: ['removeslowmode', 'noslowmode'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const channel = interaction.channel;

      await channel.setRateLimitPerUser(0);

      const embed = successEmbed('Successfully removed slowmode from this channel.');
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in unslowmode command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while removing slowmode.')],
        ephemeral: true
      });
    }
  }
};
