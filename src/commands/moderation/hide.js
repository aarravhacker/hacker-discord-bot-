const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hide')
    .setDescription('Hide a channel from everyone')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to hide')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  cooldown: 5,
  aliases: ['hidechannel'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const guild = interaction.guild;
      const channel = interaction.options.getChannel('channel') || interaction.channel;

      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        ViewChannel: false
      });

      const embed = successEmbed(`Successfully hidden ${channel} from everyone.`);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in hide command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while hiding the channel.')],
        ephemeral: true
      });
    }
  }
};
