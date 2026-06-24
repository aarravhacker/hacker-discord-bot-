const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('archivechannel')
    .setDescription('Archive a channel by locking it and renaming it')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to archive').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for archiving')),
  cooldown: 5,
  aliases: ['charchive'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
    if (!channel) return interaction.reply({ embeds: [errorEmbed('Please provide a valid channel.')] });

    const reason = interaction.options?.getString('reason') || args?.slice(1).join(' ') || 'Archived by admin';

    try {
      const everyone = interaction.guild.roles.everyone;
      await channel.permissionOverwrites.edit(everyone, { SendMessages: false });
      await channel.setName(`archived-${channel.name}`);
      await channel.setTopic(`[ARCHIVED] ${reason}`);

      const logChannel = interaction.guild.channels.cache.find(c => c.name === 'mod-logs');
      if (logChannel) {
        await logChannel.send({
          embeds: [successEmbed(`Channel **#${channel.name}** archived by ${user} | Reason: ${reason}`)]
        });
      }

      await interaction.reply({
        embeds: [successEmbed(`Archived ${channel} | Reason: ${reason}`)]
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to archive channel: ${err.message}`)] });
    }
  }
};
