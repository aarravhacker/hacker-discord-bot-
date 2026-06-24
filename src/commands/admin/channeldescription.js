const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channeldescription')
    .setDescription('Set a custom description for a channel (stored in guild config)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel').setRequired(true))
    .addStringOption(opt => opt.setName('description').setDescription('Description to set (leave empty to view)').setMaxLength(1024)),
  cooldown: 3,
  aliases: ['chdesc', 'channeldesc'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
            if (!channel) return interaction.reply({ embeds: [errorEmbed('Please provide a valid channel.')] });

            const description = interaction.options?.getString('description') || args?.slice(1).join(' ');

            const guildData = await getGuild(interaction.guild.id);
            const channelDescriptions = guildData.channelDescriptions || {};

            if (!description) {
              const desc = channelDescriptions[channel.id] || 'No description set.';
              return interaction.reply({ embeds: [infoEmbed(`**${channel.name}** description:\n${desc}`)] });
            }

            channelDescriptions[channel.id] = description;
            await updateGuild(interaction.guild.id, { channelDescriptions });

            await interaction.reply({ embeds: [successEmbed(`Description set for ${channel}`)] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};