const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('behaviorhealth')
    .setDescription('Check behavior system health')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['bhealth', 'behaviorsyshealth'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription('You need Administrator permission to use this command.');
      return interaction.reply({ embeds: [embed] });
    }

    try {
      const profiles = [...securityEngine.profiles.values()].filter(p => p.guildId === guild.id && !p.userId.includes(':'));
      const incidents = securityEngine.getIncidents(guild.id, 100);

      const healthChecks = [];

      const profileHealth = profiles.length > 0 ? { status: 'healthy', label: '✅' } : { status: 'degraded', label: '⚠️' };
      healthChecks.push({ name: 'User Profiles', ...profileHealth, detail: `${profiles.length} active profiles` });

      const totalAnomalies = profiles.reduce((sum, p) => sum + p.anomalies.length, 0);
      const anomalyHealth = totalAnomalies < 50 ? { status: 'healthy', label: '✅' } : { status: 'warning', label: '⚠️' };
      healthChecks.push({ name: 'Anomaly Detection', ...anomalyHealth, detail: `${totalAnomalies} anomalies tracked` });

      let highRiskCount = 0;
      for (const profile of profiles) {
        const risk = securityEngine.calculateRisk(guild.id, profile.userId);
        if (risk > 75) highRiskCount++;
      }
      const riskHealth = highRiskCount === 0 ? { status: 'healthy', label: '✅' } : { status: 'warning', label: '⚠️' };
      healthChecks.push({ name: 'Risk Assessment', ...riskHealth, detail: `${highRiskCount} critical risk users` });

      const baseline = securityEngine.profiles.get(`baseline:${guild.id}`);
      const baselineHealth = baseline ? { status: 'healthy', label: '✅' } : { status: 'info', label: 'ℹ️' };
      healthChecks.push({ name: 'Behavioral Baseline', ...baselineHealth, detail: baseline ? 'Configured' : 'Using defaults' });

      const alertSettings = securityEngine.profiles.get(`behaviorAlert:${guild.id}`);
      const alertHealth = alertSettings && alertSettings.enabled ? { status: 'healthy', label: '✅' } : { status: 'info', label: 'ℹ️' };
      healthChecks.push({ name: 'Alert System', ...alertHealth, detail: alertSettings ? `Threshold: ${alertSettings.threshold}` : 'Not configured' });

      const behaviorIncidents = incidents.filter(i => i.type.includes('anomaly') || i.type.includes('behavior'));
      const incidentHealth = behaviorIncidents.length < 20 ? { status: 'healthy', label: '✅' } : { status: 'warning', label: '⚠️' };
      healthChecks.push({ name: 'Incident Logger', ...incidentHealth, detail: `${behaviorIncidents.length} behavior incidents` });

      const settings = securityEngine.profiles.get(`behaviorSettings:${guild.id}`);
      const monitoringHealth = settings && settings.monitoringEnabled ? { status: 'healthy', label: '✅' } : { status: 'warning', label: '⚠️' };
      healthChecks.push({ name: 'Monitoring Engine', ...monitoringHealth, detail: settings?.monitoringEnabled ? 'Active' : 'Inactive' });

      const overallStatus = healthChecks.some(h => h.status === 'critical') ? '❌ Critical' :
        healthChecks.some(h => h.status === 'warning') ? '⚠️ Warning' :
          healthChecks.some(h => h.status === 'degraded') ? '⚠️ Degraded' : '✅ Healthy';

      const overallColor = healthChecks.some(h => h.status === 'critical') ? 0xed4245 :
        healthChecks.some(h => h.status === 'warning' || h.status === 'degraded') ? 0xffa500 : 0x57f287;

      const embed = new EmbedBuilder()
        .setTitle('🏥 Behavior System Health')
        .setDescription(`Overall Status: ${overallStatus}`)
        .setColor(overallColor)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
        .addFields(
          { name: '👥 Profiles', value: `${profiles.length}`, inline: true },
          { name: '🚨 Anomalies', value: `${totalAnomalies}`, inline: true },
          { name: '⚠️ High Risk', value: `${highRiskCount}`, inline: true }
        );

      const healthList = healthChecks.map(h =>
        `${h.label} **${h.name}**: ${h.status}${h.detail ? ` (${h.detail})` : ''}`
      ).join('\n');
      embed.addFields({ name: '📋 Health Checks', value: healthList, inline: false });

      const totalMessages = profiles.reduce((sum, p) => sum + p.messageCount, 0);
      const totalEdits = profiles.reduce((sum, p) => sum + p.editCount, 0);
      const totalDeletes = profiles.reduce((sum, p) => sum + (p.deleteDelete || 0), 0);

      embed.addFields({
        name: '📊 Activity Summary',
        value: `Messages: **${totalMessages}** | Edits: **${totalEdits}** | Deletes: **${totalDeletes}**`,
        inline: false
      });

      securityEngine.logIncident(guild.id, user.id, 'behavior_health_checked', {
        overallStatus,
        profiles: profiles.length,
        anomalies: totalAnomalies,
        highRisk: highRiskCount
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to check behavior system health.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
