const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdownstatus')
    .setDescription('View current lockdown status')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['ldstatus'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);
      const lockdownConfig = JSON.parse(guildData.lockdown_config || '{}');

      const embed = infoEmbed(
        'Lockdown Status',
        `**Server Locked:** ${guildData.lockdown_enabled ? '🔒 Yes' : '🔓 No'}\n` +
        `**Bypass Role:** ${lockdownConfig.bypassRole ? `<@&${lockdownConfig.bypassRole}>` : 'Not set'}\n` +
        `**Log Channel:** ${lockdownConfig.logChannel ? `<#${lockdownConfig.logChannel}>` : 'Not set'}\n` +
        `**Auto Lock:** ${lockdownConfig.autoLock ? '✅ Enabled' : '❌ Disabled'}`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to check lockdown status.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
