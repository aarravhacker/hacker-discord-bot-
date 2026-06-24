const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('topic')
    .setDescription('Set or view channel topic')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel').setRequired(true))
    .addStringOption(opt => opt.setName('topic').setDescription('Topic to set (leave empty to view)')),
  cooldown: 3,
  aliases: ['settopic', 'chtopic'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
    if (!channel) return interaction.reply({ embeds: [errorEmbed('Please provide a valid channel.')] });

    const topic = interaction.options?.getString('topic') || args?.slice(1).join(' ');

    if (!topic) {
      return interaction.reply({ embeds: [infoEmbed(`**${channel.name}** topic:\n${channel.topic || 'No topic set'}`)] });
    }

    try {
      await channel.setTopic(topic);
      await interaction.reply({ embeds: [successEmbed(`Updated topic for ${channel}`)] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to set topic: ${err.message}`)] });
    }
  }
};
