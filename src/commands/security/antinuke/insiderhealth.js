const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('insiderhealth')
    .setDescription('Check insider detection system health')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['ihealth', 'insiderhealth'],
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
      const decoys = securityEngine.getDecoys(guild.id);
      const stage = securityEngine.getStage(guild.id);

      let trackedUsers = 0;
      let activeProfiles = 0;
      guild.members.cache.forEach(m => {
        if (m.user.bot) return;
        const profile = securityEngine.getProfile(guild.id, m.id);
        trackedUsers++;
        if (profile.lastActivity && Date.now() - profile.lastActivity < 86400000) {
          activeProfiles++;
        }
      });

      const settings = global.insiderSettings?.[guild.id] || {};
      const alerts = global.insiderAlertConfig?.[guild.id] || {};

      const anomalyIncidents = incidents.filter(i => i.type === 'anomaly_detected');
      const trustIncidents = incidents.filter(i => i.type === 'trust_modified');
      const decoyTriggers = incidents.filter(i => i.type === 'decoy_triggered');

      const lastAnomaly = anomalyIncidents.length > 0 ? anomalyIncidents[0] : null;
      const lastAnomalyTime = lastAnomaly ? `<t:${Math.floor(lastAnomaly.timestamp / 1000)}:R>` : 'Never';

      let healthScore = 100;
      if (stage.stage >= 4) healthScore -= 40;
      else if (stage.stage >= 2) healthScore -= 20;
      if (anomalyIncidents.length > 10) healthScore -= 15;
      if (decoyTriggers.length > 0) healthScore -= 10;
      if (!settings.autoScan) healthScore -= 5;
      if (!alerts.alertChannel) healthScore -= 5;
      healthScore = Math.max(0, healthScore);

      let healthColor = 0x00ff00;
      let healthLabel = 'Excellent';
      if (healthScore < 50) { healthColor = 0xff0000; healthLabel = 'Critical'; }
      else if (healthScore < 70) { healthColor = 0xff6600; healthLabel = 'Warning'; }
      else if (healthScore < 90) { healthColor = 0xffff00; healthLabel = 'Good'; }

      const embed = new EmbedBuilder()
        .setTitle('❤️ Insider Detection Health')
        .setDescription(`System health score: **${healthScore}/100** — ${healthLabel}`)
        .setColor(healthColor)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      embed.addFields({
        name: '📊 System Status',
        value: `Security Stage: **${stage.name}**\nHealth Score: **${healthScore}**/100`,
        inline: true
      });

      embed.addFields({
        name: '👥 Monitoring',
        value: `Tracked Users: **${trackedUsers}**\nActive (24h): **${activeProfiles}**`,
        inline: true
      });

      embed.addFields({
        name: '📋 Incident Stats',
        value: `Total: **${incidents.length}**\nAnomalies: **${anomalyIncidents.length}**\nTrust Events: **${trustIncidents.length}**\nDecoy Triggers: **${decoyTriggers.length}**`,
        inline: true
      });

      embed.addFields({
        name: '🪤 Decoy Status',
        value: `Total: **${decoys.length}**\nTriggered: **${decoys.filter(d => d.triggered).length}**`,
        inline: true
      });

      embed.addFields({
        name: '⏰ Last Activity',
        value: `Last Anomaly: ${lastAnomalyTime}\nLast Incident: ${incidents.length > 0 ? `<t:${Math.floor(incidents[0].timestamp / 1000)}:R>` : 'Never'}`,
        inline: true
      });

      embed.addFields({
        name: '⚙️ Configuration',
        value: `Auto Scan: ${settings.autoScan ? '✅' : '❌'}\nAlert Channel: ${alerts.alertChannel ? '✅' : '❌'}\nMin Level: **${(settings.minThreatLevel || 'medium').toUpperCase()}**`,
        inline: true
      });

      const checks = [];
      checks.push(`${settings.autoScan ? '✅' : '❌'} Auto scanning`);
      checks.push(`${alerts.alertChannel ? '✅' : '❌'} Alert channel configured`);
      checks.push(`${stage.stage === 0 ? '✅' : '⚠️'} Security stage nominal`);
      checks.push(`${anomalyIncidents.length < 10 ? '✅' : '⚠️'} Anomaly count normal`);
      checks.push(`${decoys.length > 0 ? '✅' : '⚠️'} Decoys deployed`);

      embed.addFields({
        name: '🔍 Health Checks',
        value: checks.join('\n'),
        inline: false
      });

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while checking insider detection health.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
