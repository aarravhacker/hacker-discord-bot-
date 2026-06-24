const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');
const { formatDuration } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('securitystatus')
    .setDescription('Shows overall security status for the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['secstatus', 'secstat'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    try {
      const report = securityEngine.generateReport(guild.id);
      const stage = report.currentStage;
      const stageColors = {
        0: 0x00ff00,
        1: 0xffff00,
        2: 0xffaa00,
        3: 0xff6600,
        4: 0xff0000,
        5: 0x0099ff
      };

      const stageEmojis = {
        0: '🟢',
        1: '🟡',
        2: '🟠',
        3: '🔴',
        4: '⛔',
        5: '🔄'
      };

      const embed = new EmbedBuilder()
        .setTitle('🛡️ Server Security Status')
        .setDescription(`${stageEmojis[stage.stage] || '⚪'} **Current Stage:** ${stage.name} (Stage ${stage.stage})`)
        .setColor(stageColors[stage.stage] || 0x5865f2)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      embed.addFields(
        {
          name: '🚨 Active Incidents',
          value: `**${report.unresolvedIncidents}** unresolved out of ${report.totalIncidents} total`,
          inline: true
        },
        {
          name: '🤝 Trust Statistics',
          value: `**${report.riskSummary.critical}** critical\n**${report.riskSummary.high}** high\n**${report.riskSummary.medium}** medium\n**${report.riskSummary.low}** low`,
          inline: true
        },
        {
          name: '⚡ Join Velocity',
          value: `**${report.joinVelocity.count}** joins in last 5 min\nStatus: ${report.joinVelocity.isRapid ? '🔴 Rapid' : '🟢 Normal'}`,
          inline: true
        },
        {
          name: '🎯 Active Decoys',
          value: `**${report.activeDecoys}** triggered out of ${report.totalDecoys} total`,
          inline: true
        },
        {
          name: '📊 Risk Summary',
          value: `Critical: **${report.riskSummary.critical}**\nHigh: **${report.riskSummary.high}**\nMedium: **${report.riskSummary.medium}**\nLow: **${report.riskSummary.low}**`,
          inline: true
        },
        {
          name: '💡 Recommendations',
          value: report.recommendations.length > 0 ? report.recommendations.map(r => `• ${r}`).join('\n') : '• Security posture looks good',
          inline: false
        }
      );

      if (report.recentIncidents.length > 0) {
        const recentList = report.recentIncidents.slice(0, 5).map(i => {
          const timeAgo = formatDuration(Date.now() - i.timestamp);
          return `• ${i.type} (${timeAgo} ago)`;
        }).join('\n');
        embed.addFields({ name: '📜 Recent Incidents', value: recentList, inline: false });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to fetch security status.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};