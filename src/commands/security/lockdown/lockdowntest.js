const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdowntest')
    .setDescription('Test lockdown system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 30,
  aliases: ['ldtest'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);
      const lockdownConfig = JSON.parse(guildData.lockdown_config || '{}');

      const embed = infoEmbed(
        'Lockdown System Test',
        `**Status:** ✅ Active\n` +
        `**Server Locked:** ${guildData.lockdown_enabled ? '🔒 Yes' : '🔓 No'}\n` +
        `**Bypass Role:** ${lockdownConfig.bypassRole ? `<@&${lockdownConfig.bypassRole}>` : 'Not set'}\n` +
        `**Log Channel:** ${lockdownConfig.logChannel ? `<#${lockdownConfig.logChannel}>` : 'Not set'}\n` +
        `**Auto Lock:** ${lockdownConfig.autoLock ? '✅ Enabled' : '❌ Disabled'}\n` +
        `**Total Channels:** ${guild.channels.cache.size}\n` +
        `**Text Channels:** ${guild.channels.cache.filter(c => c.type === 0).size}\n` +
        `**Voice Channels:** ${guild.channels.cache.filter(c => c.type === 2).size}`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to test lockdown system.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
