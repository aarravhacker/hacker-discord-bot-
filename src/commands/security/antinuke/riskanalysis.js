const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('riskanalysis')
    .setDescription('Shows risk analysis for a user or the whole server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to analyze (leave empty for server-wide analysis)')
    ),
  cooldown: 5,
  aliases: ['risk', 'riskcheck'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    try {
      let targetUser = null;
      if (isSlash) {
        targetUser = interaction.options.getUser('user');
      } else {
        const argsList = interaction.content.split(' ').slice(1);
        const userId = argsList[0]?.replace(/[<@!>]/g, '');
        if (userId) {
          targetUser = await guild.members.fetch(userId).then(m => m.user).catch(() => null);
        }
      }

      if (targetUser) {
        const profile = securityEngine.getProfile(guild.id, targetUser.id);
        const risk = securityEngine.calculateRisk(guild.id, targetUser.id);
        const joinVelocity = securityEngine.analyzeJoinVelocity(guild.id, 60000);
        const actionVelocity = securityEngine.analyzeActionVelocity(guild.id, targetUser.id, 'message', 60000);
        const permissionEscalation = securityEngine.analyzePermissionEscalation(guild.id, targetUser.id);

        let riskColor = 0x00ff00;
        if (risk > 75) riskColor = 0xff0000;
        else if (risk > 50) riskColor = 0xff6600;
        else if (risk > 25) riskColor = 0xffff00;

        const embed = new EmbedBuilder()
          .setTitle(`📊 Risk Analysis: ${targetUser.tag}`)
          .setColor(riskColor)
          .setTimestamp()
          .setThumbnail(targetUser.displayAvatarURL());

        embed.addFields(
          { name: '🎯 Overall Risk Score', value: `**${risk}**/100`, inline: true },
          { name: '👤 Account Age', value: `**${Math.floor((Date.now() - profile.firstSeen) / 86400000)}** days`, inline: true },
          { name: '💬 Message Count', value: `**${profile.messageCount}**`, inline: true }
        );

        const joinVelocityColor = joinVelocity.riskLevel === 'critical' ? '🔴' :
          joinVelocity.riskLevel === 'high' ? '🟠' :
            joinVelocity.riskLevel === 'medium' ? '🟡' : '🟢';

        embed.addFields({
          name: '⚡ Join Velocity (Server)',
          value: `${joinVelocityColor} **${joinVelocity.count}** joins/min\nStatus: ${joinVelocity.isRapid ? 'Rapid' : 'Normal'}`,
          inline: true
        });

        const actionVelocityColor = actionVelocity.riskLevel === 'critical' ? '🔴' :
          actionVelocity.riskLevel === 'high' ? '🟠' :
            actionVelocity.riskLevel === 'medium' ? '🟡' : '🟢';

        embed.addFields({
          name: '🏃 Action Velocity (User)',
          value: `${actionVelocityColor} **${actionVelocity.count}** actions/min\nStatus: ${actionVelocity.isRapid ? 'Rapid' : 'Normal'}`,
          inline: true
        });

        const permColor = permissionEscalation.riskLevel === 'critical' ? '🔴' :
          permissionEscalation.riskLevel === 'high' ? '🟠' :
            permissionEscalation.riskLevel === 'medium' ? '🟡' : '🟢';

        embed.addFields({
          name: '🔓 Permission Escalation',
          value: `${permColor} **${permissionEscalation.escalations}** escalations detected`,
          inline: true
        });

        const indicators = [];
        if (profile.burstCount > 10) indicators.push('High burst activity');
        if (profile.channelDeletes > 0) indicators.push('Channel deletions');
        if (profile.memberBans > 0) indicators.push('Member bans');
        if (profile.memberKicks > 0) indicators.push('Member kicks');
        if (profile.roleChanges > 5) indicators.push('Frequent role changes');
        if (profile.permissionEscalations > 2) indicators.push('Multiple permission escalations');

        if (indicators.length > 0) {
          embed.addFields({
            name: '⚠️ Risk Indicators',
            value: indicators.map(i => `• ${i}`).join('\n'),
            inline: false
          });
        }

        const recommendations = [];
        if (risk > 75) recommendations.push('Consider immediate review of this user');
        if (risk > 50) recommendations.push('Monitor this user closely');
        if (profile.channelDeletes > 0) recommendations.push('Investigate channel deletion activity');
        if (profile.memberBans > 0) recommendations.push('Review ban actions');
        if (recommendations.length === 0) recommendations.push('No immediate action required');

        embed.addFields({
          name: '💡 Recommendations',
          value: recommendations.map(r => `• ${r}`).join('\n'),
          inline: false
        });

        await interaction.reply({ embeds: [embed] });

      } else {
        const joinVelocity = securityEngine.analyzeJoinVelocity(guild.id, 300000);
        const allProfiles = [...securityEngine.profiles.values()].filter(p => p.guildId === guild.id);

        let totalRisk = 0;
        let highRiskCount = 0;
        allProfiles.forEach(p => {
          const risk = securityEngine.calculateRisk(guild.id, p.userId);
          totalRisk += risk;
          if (risk > 75) highRiskCount++;
        });
        const avgRisk = allProfiles.length > 0 ? Math.round(totalRisk / allProfiles.length) : 0;

        let riskColor = 0x00ff00;
        if (avgRisk > 75) riskColor = 0xff0000;
        else if (avgRisk > 50) riskColor = 0xff6600;
        else if (avgRisk > 25) riskColor = 0xffff00;

        const embed = new EmbedBuilder()
          .setTitle('📊 Server-Wide Risk Analysis')
          .setColor(riskColor)
          .setTimestamp()
          .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

        embed.addFields(
          { name: '📊 Average Risk Score', value: `**${avgRisk}**/100`, inline: true },
          { name: '👥 Total Profiles', value: `**${allProfiles.length}**`, inline: true },
          { name: '🔴 High Risk Users', value: `**${highRiskCount}**`, inline: true }
        );

        const joinVelocityColor = joinVelocity.riskLevel === 'critical' ? '🔴' :
          joinVelocity.riskLevel === 'high' ? '🟠' :
            joinVelocity.riskLevel === 'medium' ? '🟡' : '🟢';

        embed.addFields({
          name: '⚡ Server Join Velocity',
          value: `${joinVelocityColor} **${joinVelocity.count}** joins in last 5 min\nVelocity: **${joinVelocity.velocity.toFixed(2)}** joins/min`,
          inline: true
        });

        const riskDistribution = {
          critical: allProfiles.filter(p => securityEngine.calculateRisk(guild.id, p.userId) > 75).length,
          high: allProfiles.filter(p => { const r = securityEngine.calculateRisk(guild.id, p.userId); return r > 50 && r <= 75; }).length,
          medium: allProfiles.filter(p => { const r = securityEngine.calculateRisk(guild.id, p.userId); return r > 25 && r <= 50; }).length,
          low: allProfiles.filter(p => securityEngine.calculateRisk(guild.id, p.userId) <= 25).length
        };

        embed.addFields({
          name: '📈 Risk Distribution',
          value: `🔴 Critical (>75): **${riskDistribution.critical}**\n🟠 High (50-75): **${riskDistribution.high}**\n🟡 Medium (25-50): **${riskDistribution.medium}**\n🟢 Low (<25): **${riskDistribution.low}**`,
          inline: false
        });

        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to perform risk analysis.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};