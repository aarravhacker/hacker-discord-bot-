const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('memberlognick')
    .setDescription('Toggle logging of nickname changes')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['memlognick'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const guild = await getGuild(interaction.guildId);
            const enabled = !guild.memberLogNicks;
            await updateGuild(interaction.guildId, { memberLogNicks: enabled });
            const embed = enabled
              ? successEmbed('Nickname Logging Enabled', 'Nickname change logging is now **enabled**.')
              : successEmbed('Nickname Logging Disabled', 'Nickname change logging is now **disabled**.');
            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};