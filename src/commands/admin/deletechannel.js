const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deletechannel')
    .setDescription('Delete a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to delete').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for deletion')),
  cooldown: 5,
  aliases: ['chdelete', 'removechannel', 'delchannel'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
    if (!channel) return interaction.reply({ embeds: [errorEmbed('Please provide a valid channel.')] });

    const reason = interaction.options?.getString('reason') || args?.slice(1).join(' ') || 'No reason provided';

    try {
      const name = channel.name;
      await channel.delete(reason);
      await interaction.reply({ embeds: [successEmbed(`Deleted channel **#${name}** | Reason: ${reason}`)] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to delete channel: ${err.message}`)] });
    }
  }
};
