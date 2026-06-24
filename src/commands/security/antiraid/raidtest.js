const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidtest')
    .setDescription('Test antiraid protection')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 30,
  aliases: ['ratest'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);

      if (!guildData.antiraid_enabled) {
        return interaction.reply({ embeds: [warningEmbed('Warning', 'Antiraid is not enabled. Enable it first with `/antiraid`.')] });
      }

      const antiraidConfig = JSON.parse(guildData.antiraid_config || '{}');

      const embed = infoEmbed(
        'Antiraid Test Results',
        `**Status:** ✅ Active\n` +
        `**Join Threshold:** ${antiraidConfig.joinThreshold || 5}\n` +
        `**Time Window:** ${(antiraidConfig.timeWindow || 10000) / 1000}s\n` +
        `**Action:** ${antiraidConfig.action || 'kick'}\n` +
        `**Mode:** ${antiraidConfig.mode || 'moderate'}\n` +
        `**Captcha:** ${antiraidConfig.captchaEnabled ? '✅ Enabled' : '❌ Disabled'}\n` +
        `**Verified Role:** ${antiraidConfig.verifiedRole ? `<@&${antiraidConfig.verifiedRole}>` : 'Not set'}\n` +
        `**Raid Active:** ${antiraidConfig.raidActive ? '⚠️ Yes' : '✅ No'}`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to test antiraid protection.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
