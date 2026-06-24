const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('behaviormonitor')
    .setDescription('Real-time behavior monitor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['bmonitor', 'behaviorwatch'],
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
      const incidents = securityEngine.getIncidents(guild.id, 50);
      const joinVelocity = securityEngine.analyzeJoinVelocity(guild.id, 300000);

      let totalAnomalies = 0;
      let highRiskCount = 0;
      let recentActivity = 0;
      let activeUsers = 0;

      for (const profile of profiles) {
        totalAnomalies += profile.anomalies.length;
        const risk = securityEngine.calculateRisk(guild.id, profile.userId);
        if (risk > 60) highRiskCount++;
        if (profile.messageCount > 0) activeUsers++;
        if (Date.now() - profile.lastActivity < 3600000) recentActivity++;
      }

      const behaviorIncidents = incidents.filter(i =>
        i.type.includes('anomaly') || i.type.includes('behavior') || i.type.includes('burst')
      );

      const alertSettings = securityEngine.profiles.get(`behaviorAlert:${guild.id}`) || {
        threshold: 60,
        enabled: false
      };

      const baseline = securityEngine.profiles.get(`baseline:${guild.id}`) || {
        messagesPerMinute: 10,
        actionsPerHour: 50,
        joinsPerMinute: 3
      };

      const embed = new EmbedBuilder()
        .setTitle('🔍 Behavior Monitor')
        .setDescription('Real-time behavioral monitoring dashboard.')
        .setColor(highRiskCount > 3 ? 0xed4245 : highRiskCount > 0 ? 0xffa500 : 0x57f287)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
        .addFields(
          { name: '👥 Active Profiles', value: `${profiles.length}`, inline: true },
          { name: '👤 Active (1h)', value: `${recentActivity}`, inline: true },
          { name: '⚠️ High Risk', value: `${highRiskCount}`, inline: true },
          { name: '🚨 Total Anomalies', value: `${totalAnomalies}`, inline: true },
          { name: '👋 Join Velocity', value: `${joinVelocity.count} in 5m (${joinVelocity.riskLevel})`, inline: true },
          { name: '🔔 Alerts', value: alertSettings.enabled ? `✅ (${alertSettings.threshold}/100)` : '❌', inline: true }
        );

      if (highRiskCount > 0) {
        const highRiskList = [];
        for (const profile of profiles) {
          const risk = securityEngine.calculateRisk(guild.id, profile.userId);
          if (risk > 60) {
            highRiskList.push(`<@${profile.userId}> — Risk: **${risk}** | Anomalies: **${profile.anomalies.length}**`);
          }
        }
        highRiskList.sort((a, b) => {
          const riskA = parseInt(a.match(/Risk: \*\*(\d+)\*\*/)?.[1] || '0');
          const riskB = parseInt(b.match(/Risk: \*\*(\d+)\*\*/)?.[1] || '0');
          return riskB - riskA;
        });
        embed.addFields({ name: '🚨 High Risk Users', value: highRiskList.slice(0, 5).join('\n'), inline: false });
      }

      if (behaviorIncidents.length > 0) {
        const recentIncidents = behaviorIncidents.slice(0, 3).map(inc =>
          `• **${inc.type}** — <t:${Math.floor(inc.timestamp / 1000)}:R>`
        ).join('\n');
        embed.addFields({ name: '📋 Recent Behavior Events', value: recentIncidents, inline: false });
      }

      embed.addFields({
        name: '📏 Baseline',
        value: `Msg/min: **${baseline.messagesPerMinute}** | Actions/hr: **${baseline.actionsPerHour}** | Joins/min: **${baseline.joinsPerMinute}**`,
        inline: false
      });

      securityEngine.logIncident(guild.id, user.id, 'behavior_monitor_viewed', {
        profiles: profiles.length,
        highRiskCount,
        totalAnomalies,
        recentActivity
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to load behavior monitor.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
