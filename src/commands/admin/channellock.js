const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channellock')
    .setDescription('Lock or unlock a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to lock/unlock').setRequired(true))
    .addBooleanOption(opt => opt.setName('lock').setDescription('Lock (true) or unlock (false)').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason')),
  cooldown: 3,
  aliases: ['chlock', 'lockch', 'unlockch'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
    const lock = interaction.options?.getBoolean('lock') ?? (args?.[1] !== 'unlock');
    const reason = interaction.options?.getString('reason') || args?.slice(2).join(' ') || (lock ? 'Locked by admin' : 'Unlocked by admin');

    if (!channel) return interaction.reply({ embeds: [errorEmbed('Please provide a valid channel.')] });

    try {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: !lock
      });

      await interaction.reply({
        embeds: [successEmbed(`${lock ? '🔒 Locked' : '🔓 Unlocked'} ${channel} | Reason: ${reason}`)]
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to ${lock ? 'lock' : 'unlock'} channel: ${err.message}`)] });
    }
  }
};
