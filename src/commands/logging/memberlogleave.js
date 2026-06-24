const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('memberlogleave')
    .setDescription('Toggle logging of member leaves')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['memlogleave'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const guild = await getGuild(interaction.guildId);
            const enabled = !guild.memberLogLeaves;
            await updateGuild(interaction.guildId, { memberLogLeaves: enabled });
            const embed = enabled
              ? successEmbed('Leave Logging Enabled', 'Member leave logging is now **enabled**.')
              : successEmbed('Leave Logging Disabled', 'Member leave logging is now **disabled**.');
            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};