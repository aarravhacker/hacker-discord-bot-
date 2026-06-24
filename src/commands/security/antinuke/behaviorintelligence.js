const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('behaviorintelligence')
    .setDescription('Behavior intelligence analysis')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['bintelligence', 'behaviorintel'],
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
      const incidents = securityEngine.getIncidents(guild.id, 200);
      const raidGroup = securityEngine.detectRaidGroup(guild.id);
      const altNetwork = securityEngine.detectAltNetwork(guild.id);
      const joinVelocity = securityEngine.analyzeJoinVelocity(guild.id, 300000);

      const threatActors = [];
      const insiderThreats = [];
      const suspiciousPatterns = [];

      for (const profile of profiles) {
        const risk = securityEngine.calculateRisk(guild.id, profile.userId);
        const insider = securityEngine.detectInsiderThreat(guild.id, profile.userId);

        if (risk > 50) {
          threatActors.push({
            userId: profile.userId,
            risk,
            anomalies: profile.anomalies.length,
            messages: profile.messageCount
          });
        }

        if (insider.isThreat) {
          insiderThreats.push({
            userId: profile.userId,
            level: insider.threatLevel,
            indicators: insider.indicators
          });
        }

        if (profile.burstCount > 10) {
          suspiciousPatterns.push({
            userId: profile.userId,
            type: 'burst_activity',
            count: profile.burstCount
          });
        }

        if (profile.channelDeletes > 1) {
          suspiciousPatterns.push({
            userId: profile.userId,
            type: 'mass_channel_delete',
            count: profile.channelDeletes
          });
        }
      }

      threatActors.sort((a, b) => b.risk - a.risk);
      insiderThreats.sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.level] || 4) - (order[b.level] || 4);
      });

      const embed = new EmbedBuilder()
        .setTitle('🧠 Behavior Intelligence')
        .setDescription('Advanced behavioral intelligence analysis for threat detection.')
        .setColor(threatActors.length > 3 ? 0xed4245 : threatActors.length > 0 ? 0xffa500 : 0x57f287)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
        .addFields(
          { name: '👥 Profiles Analyzed', value: `${profiles.length}`, inline: true },
          { name: '⚠️ Threat Actors', value: `${threatActors.length}`, inline: true },
          { name: '🕵️ Insider Threats', value: `${insiderThreats.length}`, inline: true },
          { name: '🏴 Suspicious Patterns', value: `${suspiciousPatterns.length}`, inline: true }
        );

      if (raidGroup) {
        embed.addFields({
          name: '🚨 Active Raid',
          value: `Detected **${raidGroup.length}** raid group(s) with **${raidGroup.flat().length}** members.`,
          inline: false
        });
      }

      if (altNetwork) {
        embed.addFields({
          name: '🕵️ Alt Network',
          value: `Detected **${altNetwork.length}** potential alt accounts.`,
          inline: false
        });
      }

      if (threatActors.length > 0) {
        const actorList = threatActors.slice(0, 5).map((a, i) => {
          let riskEmoji = '🟢';
          if (a.risk > 75) riskEmoji = '🔴';
          else if (a.risk > 50) riskEmoji = '🟠';
          return `**${i + 1}.** <@${a.userId}> — Risk: ${riskEmoji} **${a.risk}** | Anomalies: ${a.anomalies}`;
        }).join('\n');
        embed.addFields({ name: '⚠️ Top Threat Actors', value: actorList, inline: false });
      }

      if (insiderThreats.length > 0) {
        const insiderList = insiderThreats.slice(0, 5).map(t =>
          `• <@${t.userId}> — Level: **${t.level}** | Indicators: ${t.indicators.length}`
        ).join('\n');
        embed.addFields({ name: '🕵️ Insider Threats', value: insiderList, inline: false });
      }

      if (suspiciousPatterns.length > 0) {
        const patternList = suspiciousPatterns.slice(0, 5).map(p =>
          `• <@${p.userId}> — **${p.type}** (Count: ${p.count})`
        ).join('\n');
        embed.addFields({ name: '🔍 Suspicious Patterns', value: patternList, inline: false });
      }

      embed.addFields({
        name: '📈 Join Analysis',
        value: `Velocity: **${joinVelocity.count}** joins in 5m (${joinVelocity.riskLevel} risk)\nRapid: ${joinVelocity.isRapid ? '🚨 Yes' : '✅ No'}`,
        inline: false
      });

      const recommendations = securityEngine.generateRecommendations(guild.id, incidents);
      if (recommendations.length > 0) {
        const recs = recommendations.map(r => `• ${r}`).join('\n');
        embed.addFields({ name: '💡 Recommendations', value: recs, inline: false });
      }

      securityEngine.logIncident(guild.id, user.id, 'behavior_intelligence_viewed', {
        profiles: profiles.length,
        threatActors: threatActors.length,
        insiderThreats: insiderThreats.length,
        suspiciousPatterns: suspiciousPatterns.length
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to load behavior intelligence.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
