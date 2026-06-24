const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clone')
    .setDescription('Clone a channel')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to clone')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  cooldown: 5,
  aliases: ['clonechannel', 'copychannel'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const guild = interaction.guild;
      const channel = interaction.options.getChannel('channel') || interaction.channel;

      const cloned = await channel.clone();

      const embed = successEmbed(
        `Successfully cloned ${channel} to ${cloned}.`
      );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in clone command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while cloning the channel.')],
        ephemeral: true
      });
    }
  }
};
