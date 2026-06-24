const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('forensicscan')
    .setDescription('Run a full forensics scan on the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['fscan', 'forensicscan'],
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

      const loadingEmbed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setDescription('🔍 Running full forensics scan...')
        .setTimestamp();
      await interaction.reply({ embeds: [loadingEmbed] });

      const incidents = securityEngine.getIncidents(guild.id, 500);
      const stage = securityEngine.getStage(guild.id);
      const decoys = securityEngine.getDecoys(guild.id);
      const joinVelocity = securityEngine.analyzeJoinVelocity(guild.id, 300000);

      let highRiskUsers = 0;
      let threatActors = 0;
      guild.members.cache.forEach(m => {
        if (m.user.bot) return;
        const risk = securityEngine.calculateRisk(guild.id, m.id);
        if (risk > 70) highRiskUsers++;
        if (risk > 85) threatActors++;
      });

      const anomalyIncidents = incidents.filter(i => i.type === 'anomaly_detected');
      const decoyTriggers = incidents.filter(i => i.type === 'decoy_triggered');
      const trustEvents = incidents.filter(i => i.type === 'trust_modified');
      const raidEvents = incidents.filter(i => i.type === 'raid_detected');

      const last24h = incidents.filter(i => Date.now() - i.timestamp < 86400000);
      const last7d = incidents.filter(i => Date.now() - i.timestamp < 604800000);

      let severityScore = 0;
      severityScore += threatActors * 30;
      severityScore += highRiskUsers * 15;
      severityScore += (decoyTriggers.length > 0 ? 20 : 0);
      severityScore += (joinVelocity.isRapid ? 15 : 0);
      severityScore += (stage.stage >= 3 ? 25 : stage.stage >= 1 ? 10 : 0);
      severityScore += Math.min(20, last24h.length * 2);
      severityScore = Math.min(100, severityScore);

      let color = 0x00ff00;
      if (severityScore > 70) color = 0xff0000;
      else if (severityScore > 40) color = 0xff6600;
      else if (severityScore > 20) color = 0xffff00;

      const embed = new EmbedBuilder()
        .setTitle('🔍 Full Forensics Scan')
        .setDescription(`Comprehensive security forensics scan for **${guild.name}**.`)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      embed.addFields({
        name: '🎯 Threat Assessment',
        value: `Severity Score: **${severityScore}**/100\nThreat Actors: **${threatActors}**\nHigh Risk Users: **${highRiskUsers}**\nSecurity Stage: **${stage.name}**`,
        inline: true
      });

      embed.addFields({
        name: '📊 Incident Summary',
        value: `Total: **${incidents.length}**\nLast 24h: **${last24h.length}**\nLast 7d: **${last7d.length}**\nAnomalies: **${anomalyIncidents.length}**`,
        inline: true
      });

      embed.addFields({
        name: '🪤 Decoy Intel',
        value: `Total: **${decoys.length}**\nTriggered: **${decoys.filter(d => d.triggered).length}**\nTrigger Events: **${decoyTriggers.length}**`,
        inline: true
      });

      embed.addFields({
        name: '📈 Network Analysis',
        value: `Join Velocity: **${joinVelocity.velocity.toFixed(1)}**/min\nVelocity Risk: **${joinVelocity.riskLevel.toUpperCase()}**\nRaid Events: **${raidEvents.length}**`,
        inline: true
      });

      const recommendations = securityEngine.generateRecommendations(guild.id, incidents);

      if (severityScore > 70) {
        embed.addFields({
          name: '🚨 CRITICAL FINDINGS',
          value: '• Multiple threat actors identified\n• Immediate investigation recommended\n• Consider escalating security stage\n• Review all staff permissions',
          inline: false
        });
      }

      if (recommendations.length > 0) {
        embed.addFields({
          name: '💡 Recommendations',
          value: recommendations.map(r => `• ${r}`).join('\n'),
          inline: false
        });
      }

      const topIncidents = incidents.slice(0, 5);
      if (topIncidents.length > 0) {
        const incidentList = topIncidents.map(i =>
          `• ${securityEngine.explainThreat(i)} — <t:${Math.floor(i.timestamp / 1000)}:R>`
        ).join('\n');

        embed.addFields({
          name: '📋 Top Recent Incidents',
          value: incidentList.substring(0, 1024),
          inline: false
        });
      }

      securityEngine.logIncident(guild.id, user.id, 'forensic_scan', {
        severityScore,
        threatActors,
        highRiskUsers,
        totalIncidents: incidents.length
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred during the forensics scan.')
        .setColor(0xff0000)
        .setTimestamp();
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
