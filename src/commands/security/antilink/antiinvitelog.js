const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSecurityLogs } = require('../../../db/securityRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../../utils/helpers');
const { formatDuration } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiinvitelog')
    .setDescription('View antiinvite security logs')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('limit').setDescription('Number of logs to show').setMinValue(1).setMaxValue(25)
    ),
  cooldown: 5,
  aliases: ['ailog'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const limit = isSlash ? (interaction.options?.getInteger('limit') || 10) : parseInt(interaction.content.split(' ')[1]) || 10;
      const logs = await getSecurityLogs(guild.id, 'antilink', Math.min(limit, 25));
      const inviteLogs = logs.filter(l => l.action.includes('invite'));

      if (inviteLogs.length === 0) {
        return interaction.reply({ embeds: [infoEmbed('Antiinvite Logs', 'No antiinvite logs found.')] });
      }

      const logEntries = inviteLogs.map((log, i) => {
        const timeAgo = formatDuration(Date.now() - new Date(log.created_at).getTime());
        return `**${i + 1}.** <@${log.user_id}> - ${log.action}\n> ${timeAgo} ago`;
      }).join('\n\n');

      const embed = successEmbed('Antiinvite Logs', logEntries);

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to fetch antiinvite logs.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
