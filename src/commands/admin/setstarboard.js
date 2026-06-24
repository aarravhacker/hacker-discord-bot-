const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstarboard')
    .setDescription('Configure the starboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Starboard channel').addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption(opt => opt.setName('emoji').setDescription('Star emoji (default: ⭐)'))
    .addIntegerOption(opt => opt.setName('threshold').setDescription('Reactions needed to star').setMinValue(1).setMaxValue(50)),
  cooldown: 5,
  aliases: ['starboardconfig'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
            const emoji = interaction.options?.getString('emoji') || args?.[1] || '⭐';
            const threshold = interaction.options?.getInteger('threshold') || parseInt(args?.[2]) || 5;

            const updates = {};
            if (channel) updates.starboardChannelId = channel.id;
            updates.starboardEmoji = emoji;
            updates.starboardThreshold = threshold;

            await updateGuild(interaction.guild.id, updates);

            const response = [];
            if (channel) response.push(`Starboard channel: ${channel}`);
            response.push(`Star emoji: ${emoji}`);
            response.push(`Threshold: ${threshold} reactions`);

            await interaction.reply({
              embeds: [successEmbed(`Starboard configured!\n${response.join('\n')}`)]
            });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};