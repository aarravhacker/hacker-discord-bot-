const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicelogleave')
    .setDescription('Toggle logging of voice channel leaves')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['vclogleave'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const guild = await getGuild(interaction.guildId);
            const enabled = !guild.voiceLogLeaves;
            await updateGuild(interaction.guildId, { voiceLogLeaves: enabled });
            const embed = enabled
              ? successEmbed('Voice Leave Logging Enabled', 'Voice leave logging is now **enabled**.')
              : successEmbed('Voice Leave Logging Disabled', 'Voice leave logging is now **disabled**.');
            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};