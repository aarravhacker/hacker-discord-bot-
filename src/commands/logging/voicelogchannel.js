const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicelogchannel')
    .setDescription('Set the voice log channel')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel for voice logs').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['vclogchannel'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const channel = interaction.options?.getChannel('channel') || (args && args[0] ? interaction.guild.channels.cache.get(args[0]) : null);
            if (!channel) {
              return interaction.reply({ embeds: [errorEmbed('No Channel', 'Please provide a channel.')] });
            }
            if (channel.type !== ChannelType.GuildText) {
              return interaction.reply({ embeds: [errorEmbed('Invalid Channel', 'Please select a text channel.')] });
            }

            await updateGuild(interaction.guildId, { voiceLogChannel: channel.id });
            await interaction.reply({ embeds: [successEmbed('Channel Set', `Voice log channel set to <#${channel.id}>.`)] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};