const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('insiderintelligence')
    .setDescription('Insider threat intelligence feed')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['iintel', 'insiderintel'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    try {
      if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription('You need Administrator permission to use this command.');
        return interaction.reply({ embeds: [embed] });
      }

      const incidents = securityEngine.getIncidents(guild.id, 500);
      const joinVelocity = securityEngine.analyzeJoinVelocity(guild.id, 300000);
      const raidGroup = securityEngine.detectRaidGroup(guild.id);
      const altNetwork = securityEngine.detectAltNetwork(guild.id);
      const stage = securityEngine.getStage(guild.id);
      const relationships = securityEngine.getRelationships(guild.id);

      const threatActors = [];
      guild.members.cache.forEach(m => {
        if (m.user.bot) return;
        if (m.permissions.has(PermissionFlagsBits.Administrator) ||
          m.permissions.has(PermissionFlagsBits.ManageGuild) ||
          m.permissions.has(PermissionFlagsBits.ManageRoles)) {
          const analysis = securityEngine.detectInsiderThreat(guild.id, m.id);
          if (analysis.isThreat) {
            threatActors.push({ member: m, analysis });
          }
        }
      });
      threatActors.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return (severityOrder[b.analysis.threatLevel] || 0) - (severityOrder[a.analysis.threatLevel] || 0);
      });

      const anomalyIncidents = incidents.filter(i => i.type === 'anomaly_detected');
      const decoyIncidents = incidents.filter(i => i.type === 'decoy_triggered');
      const recentAnomalies = anomalyIncidents.filter(i => Date.now() - i.timestamp < 86400000);

      let color = 0x0099ff;
      if (threatActors.some(t => t.analysis.threatLevel === 'critical')) color = 0xff0000;
      else if (threatActors.some(t => t.analysis.threatLevel === 'high')) color = 0xff6600;
      else if (recentAnomalies.length > 5) color = 0xffff00;

      const embed = new EmbedBuilder()
        .setTitle('🕵️ Insider Threat Intelligence')
        .setDescription('Comprehensive threat intelligence overview for this server.')
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      embed.addFields({
        name: '🛡️ Current Posture',
        value: `Stage: **${stage.name}** (${stage.stage})\nThreat Actors: **${threatActors.length}**\nTotal Incidents: **${incidents.length}**`,
        inline: true
      });

      embed.addFields({
        name: '📈 Velocity Analysis',
        value: `Join Rate: **${joinVelocity.velocity.toFixed(1)}**/min\nRisk: **${joinVelocity.riskLevel.toUpperCase()}**`,
        inline: true
      });

      embed.addFields({
        name: '🪤 Decoy Intel',
        value: `Total Decoys: **${securityEngine.getDecoys(guild.id).length}**\nTriggered: **${decoyIncidents.length}**`,
        inline: true
      });

      if (raidGroup) {
        embed.addFields({
          name: '⚠️ Raid Activity Detected',
          value: `Found **${raidGroup.length}** potential raid group(s) with rapid successive joins.`,
          inline: false
        });
      }

      if (altNetwork) {
        embed.addFields({
          name: '🔗 Alt Account Network',
          value: `Detected **${altNetwork.length}** suspicious accounts potentially belonging to alt networks.`,
          inline: false
        });
      }

      if (threatActors.length > 0) {
        const actorList = threatActors.slice(0, 8).map((t, i) => {
          let emoji = '🟢';
          if (t.analysis.threatLevel === 'critical') emoji = '🔴';
          else if (t.analysis.threatLevel === 'high') emoji = '🟠';
          else if (t.analysis.threatLevel === 'medium') emoji = '🟡';
          return `**${i + 1}.** ${emoji} ${t.member.user.tag} — **${t.analysis.threatLevel.toUpperCase()}** (Risk: ${t.analysis.risk})`;
        }).join('\n');

        embed.addFields({
          name: '🎯 Identified Threat Actors',
          value: actorList.substring(0, 1024),
          inline: false
        });
      }

      if (recentAnomalies.length > 0) {
        const anomalyTypes = {};
        recentAnomalies.forEach(a => {
          if (a.details.anomalies) {
            a.details.anomalies.forEach(an => {
              anomalyTypes[an.type] = (anomalyTypes[an.type] || 0) + 1;
            });
          }
        });
        const anomalyList = Object.entries(anomalyTypes)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([type, count]) => `• **${type}**: ${count} occurrences`)
          .join('\n');

        embed.addFields({
          name: '📊 24h Anomaly Breakdown',
          value: anomalyList.substring(0, 1024),
          inline: false
        });
      }

      const recommendations = securityEngine.generateRecommendations(guild.id, incidents);
      if (recommendations.length > 0) {
        embed.addFields({
          name: '💡 Intelligence Recommendations',
          value: recommendations.map(r => `• ${r}`).join('\n'),
          inline: false
        });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while generating insider intelligence.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
