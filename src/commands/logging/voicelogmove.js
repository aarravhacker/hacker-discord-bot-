const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicelogmove')
    .setDescription('Toggle logging of voice channel moves')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['vclogmove'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const guild = await getGuild(interaction.guildId);
            const enabled = !guild.voiceLogMoves;
            await updateGuild(interaction.guildId, { voiceLogMoves: enabled });
            const embed = enabled
              ? successEmbed('Voice Move Logging Enabled', 'Voice move logging is now **enabled**.')
              : successEmbed('Voice Move Logging Disabled', 'Voice move logging is now **disabled**.');
            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};