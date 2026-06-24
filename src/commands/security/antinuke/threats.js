const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');
const { formatDuration } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('threats')
    .setDescription('Shows all detected threats and anomalies')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('limit').setDescription('Number of threats to show (1-25)').setMinValue(1).setMaxValue(25)
    ),
  cooldown: 5,
  aliases: ['threatlist', 'showthreats'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    try {
      let limit = 10;
      if (isSlash) {
        limit = interaction.options.getInteger('limit') || 10;
      } else {
        const argsList = interaction.content.split(' ').slice(1);
        limit = parseInt(argsList[0]) || 10;
      }
      limit = Math.min(limit, 25);

      const incidents = securityEngine.getIncidents(guild.id, limit);

      let color = 0x00ff00;
      if (incidents.length > 0) {
        const hasCritical = incidents.some(i => i.type === 'anomaly_detected' && i.details.risk > 80);
        const hasHigh = incidents.some(i => i.type === 'anomaly_detected' && i.details.risk > 50);
        const hasMedium = incidents.some(i => i.type === 'anomaly_detected' && i.details.risk > 25);

        if (hasCritical) color = 0xff0000;
        else if (hasHigh) color = 0xff6600;
        else if (hasMedium) color = 0xffff00;
      }

      const embed = new EmbedBuilder()
        .setTitle('🚨 Detected Threats & Anomalies')
        .setDescription(`Showing latest **${Math.min(limit, incidents.length)}** threats and anomalies`)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      if (incidents.length === 0) {
        embed.addFields({
          name: '✅ No Threats Detected',
          value: 'No security incidents have been recorded yet.',
          inline: false
        });
      } else {
        const threatTypes = {};
        incidents.forEach(incident => {
          if (!threatTypes[incident.type]) threatTypes[incident.type] = 0;
          threatTypes[incident.type]++;
        });

        const typeList = Object.entries(threatTypes).map(([type, count]) => {
          let typeEmoji = '⚪';
          if (type === 'anomaly_detected') typeEmoji = '🔴';
          else if (type === 'decoy_triggered') typeEmoji = '🟠';
          else if (type === 'stage_change') typeEmoji = '🟡';
          else if (type === 'trust_modified') typeEmoji = '🔵';
          else if (type === 'raid_detected') typeEmoji = '🚨';
          return `${typeEmoji} **${type.replace(/_/g, ' ').toUpperCase()}**: ${count}`;
        }).join('\n');

        embed.addFields({
          name: '📊 Threat Breakdown',
          value: typeList,
          inline: false
        });

        const threatList = incidents.slice(0, limit).map((incident, index) => {
          const timeAgo = formatDuration(Date.now() - incident.timestamp);
          const explanation = securityEngine.explainThreat(incident);
          let severityEmoji = '⚪';
          if (incident.type === 'anomaly_detected') {
            if (incident.details.risk > 80) severityEmoji = '🔴';
            else if (incident.details.risk > 50) severityEmoji = '🟠';
            else if (incident.details.risk > 25) severityEmoji = '🟡';
            else severityEmoji = '🟢';
          } else if (incident.type === 'decoy_triggered') severityEmoji = '🟠';
          else if (incident.type === 'raid_detected') severityEmoji = '🚨';

          return `**${index + 1}.** ${severityEmoji} ${incident.type.replace(/_/g, ' ')}\n> <@${incident.userId}> - ${timeAgo} ago\n> ${explanation}`;
        }).join('\n\n');

        embed.addFields({
          name: '📜 Threat Details',
          value: threatList.substring(0, 1024) || 'None',
          inline: false
        });

        const unresolved = incidents.filter(i => !i.resolved).length;
        const resolved = incidents.filter(i => i.resolved).length;

        embed.addFields({
          name: '📋 Resolution Status',
          value: `**Unresolved:** ${unresolved}\n**Resolved:** ${resolved}`,
          inline: true
        });

        const criticalThreats = incidents.filter(i => i.type === 'anomaly_detected' && i.details.risk > 80).length;
        const highThreats = incidents.filter(i => i.type === 'anomaly_detected' && i.details.risk > 50 && i.details.risk <= 80).length;
        const mediumThreats = incidents.filter(i => i.type === 'anomaly_detected' && i.details.risk > 25 && i.details.risk <= 50).length;

        embed.addFields({
          name: '🎯 Severity Summary',
          value: `🔴 Critical: **${criticalThreats}**\n🟠 High: **${highThreats}**\n🟡 Medium: **${mediumThreats}**`,
          inline: true
        });
      }

      const recommendations = securityEngine.generateRecommendations(guild.id, incidents);
      if (recommendations.length > 0) {
        embed.addFields({
          name: '💡 Recommendations',
          value: recommendations.map(r => `• ${r}`).join('\n'),
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to fetch threats.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};