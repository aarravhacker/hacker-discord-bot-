const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidstatus')
    .setDescription('View antiraid protection status')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['rastatus'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);
      const antiraidConfig = JSON.parse(guildData.antiraid_config || '{}');

      const embed = infoEmbed(
        'Antiraid Status',
        `**Protection:** ${guildData.antiraid_enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
        `**Mode:** ${antiraidConfig.mode || 'moderate'}\n` +
        `**Join Threshold:** ${antiraidConfig.joinThreshold || 5}\n` +
        `**Time Window:** ${(antiraidConfig.timeWindow || 10000) / 1000}s\n` +
        `**Action:** ${antiraidConfig.action || 'kick'}\n` +
        `**Raid Active:** ${antiraidConfig.raidActive ? '⚠️ Yes' : '✅ No'}\n` +
        `**Raid Count:** ${antiraidConfig.raidCount || 0}\n` +
        `**Captcha:** ${antiraidConfig.captchaEnabled ? '✅ Enabled' : '❌ Disabled'}\n` +
        `**Verified Role:** ${antiraidConfig.verifiedRole ? `<@&${antiraidConfig.verifiedRole}>` : 'Not set'}\n` +
        `**Alert Channel:** ${antiraidConfig.alertChannel ? `<#${antiraidConfig.alertChannel}>` : 'Not set'}\n` +
        `**Ignore List:** ${(antiraidConfig.ignore || []).length} users`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to fetch antiraid status.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
