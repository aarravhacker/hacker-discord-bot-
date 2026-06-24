const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSecurityLogs } = require('../../../db/securityRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidstats')
    .setDescription('View raid protection statistics')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['rastats'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const allLogs = await getSecurityLogs(guild.id, 'antiraid', 1000);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayLogs = allLogs.filter(l => new Date(l.created_at) >= today);
      const raidsDetected = allLogs.filter(l => l.action === 'raid_detected').length;
      const membersKicked = allLogs.filter(l => l.action === 'raid_kick').reduce((sum, l) => {
        const details = JSON.parse(l.details || '{}');
        return sum + (details.membersKicked || 0);
      }, 0);
      const membersBanned = allLogs.filter(l => l.action === 'raid_ban').reduce((sum, l) => {
        const details = JSON.parse(l.details || '{}');
        return sum + (details.membersBanned || 0);
      }, 0);

      const embed = successEmbed(
        'Raid Protection Statistics',
        `**Total Logs:** ${allLogs.length}\n` +
        `**Today's Events:** ${todayLogs.length}\n` +
        `**Raids Detected:** ${raidsDetected}\n` +
        `**Members Kicked:** ${membersKicked}\n` +
        `**Members Banned:** ${membersBanned}`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to fetch raid statistics.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
