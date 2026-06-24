const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSecurityLogs } = require('../../../db/securityRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../../utils/helpers');
const { formatDuration } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidlog')
    .setDescription('View raid event logs')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('limit').setDescription('Number of logs to show').setMinValue(1).setMaxValue(25)
    ),
  cooldown: 5,
  aliases: ['ralog'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const limit = isSlash ? (interaction.options?.getInteger('limit') || 10) : parseInt(interaction.content.split(' ')[1]) || 10;
      const logs = await getSecurityLogs(guild.id, 'antiraid', Math.min(limit, 25));

      if (logs.length === 0) {
        return interaction.reply({ embeds: [infoEmbed('Raid Logs', 'No raid logs found.')] });
      }

      const logEntries = logs.map((log, i) => {
        const timeAgo = formatDuration(Date.now() - new Date(log.created_at).getTime());
        return `**${i + 1}.** <@${log.user_id}> - ${log.action}\n> ${timeAgo} ago`;
      }).join('\n\n');

      const embed = successEmbed('Raid Logs', logEntries);

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to fetch raid logs.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
