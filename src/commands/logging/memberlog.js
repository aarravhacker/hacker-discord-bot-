const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('memberlog')
    .setDescription('Toggle member logging on or off')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['memlog'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const guild = await getGuild(interaction.guildId);
            const enabled = !guild.memberLogEnabled;
            await updateGuild(interaction.guildId, { memberLogEnabled: enabled });
            const embed = enabled
              ? successEmbed('Member Logging Enabled', 'Member logging is now **enabled**.')
              : successEmbed('Member Logging Disabled', 'Member logging is now **disabled**.');
            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};