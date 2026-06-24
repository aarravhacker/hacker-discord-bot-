const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSecurityLogs } = require('../../../db/securityRepository');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed } = require('../../../utils/helpers');
const { formatDuration } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukelog')
    .setDescription('View antinuke security logs')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('limit').setDescription('Number of logs to show (1-25)').setMinValue(1).setMaxValue(25)
    ),
  cooldown: 5,
  aliases: ['anlog', 'antinukelogs'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const limit = isSlash ? (interaction.options?.getInteger('limit') || 10) : parseInt(interaction.content.split(' ')[1]) || 10;
      const logs = await getSecurityLogs(guild.id, 'antinuke', Math.min(limit, 25));

      if (logs.length === 0) {
        return interaction.reply({ embeds: [infoEmbed('Antinuke Logs', 'No antinuke logs found.')] });
      }

      const logEntries = logs.map((log, i) => {
        const timeAgo = formatDuration(Date.now() - new Date(log.created_at).getTime());
        return `**${i + 1}.** <@${log.user_id}> - ${log.action}\n> ${timeAgo} ago`;
      }).join('\n\n');

      const embed = successEmbed('Antinuke Logs', logEntries);

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to fetch antinuke logs.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
