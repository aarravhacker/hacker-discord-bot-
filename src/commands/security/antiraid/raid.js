const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');
const { addSecurityLog } = require('../../../db/securityRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Check current raid status')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['raidstatus'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);
      const antiraidConfig = JSON.parse(guildData.antiraid_config || '{}');
      const raidActive = antiraidConfig.raidActive || false;
      const raidCount = antiraidConfig.raidCount || 0;
      const lastRaid = antiraidConfig.lastRaid;

      const embed = successEmbed(
        'Raid Status',
        `**Raid Active:** ${raidActive ? '⚠️ YES' : '✅ No'}\n` +
        `**Raid Count:** ${raidCount}\n` +
        `**Last Raid:** ${lastRaid ? `<t:${Math.floor(new Date(lastRaid).getTime() / 1000)}:R>` : 'Never'}\n` +
        `**Protection:** ${guildData.antiraid_enabled ? '✅ Enabled' : '❌ Disabled'}`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to check raid status.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
