const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('memberlogrole')
    .setDescription('Toggle logging of role changes')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['memlogrole'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const guild = await getGuild(interaction.guildId);
            const enabled = !guild.memberLogRoles;
            await updateGuild(interaction.guildId, { memberLogRoles: enabled });
            const embed = enabled
              ? successEmbed('Role Logging Enabled', 'Role change logging is now **enabled**.')
              : successEmbed('Role Logging Disabled', 'Role change logging is now **disabled**.');
            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};