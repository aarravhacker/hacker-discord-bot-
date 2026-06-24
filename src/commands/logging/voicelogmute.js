const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicelogmute')
    .setDescription('Toggle logging of mute/unmute events')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['vclogmute'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const guild = await getGuild(interaction.guildId);
            const enabled = !guild.voiceLogMutes;
            await updateGuild(interaction.guildId, { voiceLogMutes: enabled });
            const embed = enabled
              ? successEmbed('Voice Mute Logging Enabled', 'Voice mute logging is now **enabled**.')
              : successEmbed('Voice Mute Logging Disabled', 'Voice mute logging is now **disabled**.');
            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};