const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicelogjoin')
    .setDescription('Toggle logging of voice channel joins')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['vclogjoin'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const guild = await getGuild(interaction.guildId);
            const enabled = !guild.voiceLogJoins;
            await updateGuild(interaction.guildId, { voiceLogJoins: enabled });
            const embed = enabled
              ? successEmbed('Voice Join Logging Enabled', 'Voice join logging is now **enabled**.')
              : successEmbed('Voice Join Logging Disabled', 'Voice join logging is now **disabled**.');
            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};