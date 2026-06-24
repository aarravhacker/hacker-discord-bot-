const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('insider')
    .setDescription('Checks for insider threats among staff members')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['insiderthreat', 'insidercheck'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    try {
      const staffMembers = guild.members.cache.filter(m => {
        if (m.user.bot) return false;
        return m.permissions.has(PermissionFlagsBits.Administrator) ||
          m.permissions.has(PermissionFlagsBits.ManageGuild) ||
          m.permissions.has(PermissionFlagsBits.ManageRoles) ||
          m.permissions.has(PermissionFlagsBits.ManageChannels) ||
          m.permissions.has(PermissionFlagsBits.BanMembers) ||
          m.permissions.has(PermissionFlagsBits.KickMembers);
      });

      const threats = [];
      staffMembers.forEach((staff) => {
        const analysis = securityEngine.detectInsiderThreat(guild.id, staff.id);
        if (analysis.isThreat) {
          threats.push({
            member: staff,
            analysis
          });
        }
      });

      threats.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return (severityOrder[b.analysis.threatLevel] || 0) - (severityOrder[a.analysis.threatLevel] || 0);
      });

      let color = 0x00ff00;
      if (threats.length > 0) {
        const highestThreat = threats[0].analysis.threatLevel;
        if (highestThreat === 'critical') color = 0xff0000;
        else if (highestThreat === 'high') color = 0xff6600;
        else if (highestThreat === 'medium') color = 0xffff00;
      }

      const embed = new EmbedBuilder()
        .setTitle('🕵️ Insider Threat Analysis')
        .setDescription(`Scanned **${staffMembers.size}** staff members for insider threat indicators.`)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      if (threats.length === 0) {
        embed.addFields({
          name: '✅ No Insider Threats Detected',
          value: 'All staff members appear to be operating within normal parameters.',
          inline: false
        });
      } else {
        const threatList = threats.slice(0, 10).map((data, index) => {
          let threatEmoji = '🟢';
          if (data.analysis.threatLevel === 'critical') threatEmoji = '🔴';
          else if (data.analysis.threatLevel === 'high') threatEmoji = '🟠';
          else if (data.analysis.threatLevel === 'medium') threatEmoji = '🟡';

          const indicators = data.analysis.indicators.slice(0, 3).map(i => `  • ${i}`).join('\n');
          return `**${index + 1}.** ${data.member.user.tag}\n> ${threatEmoji} Threat Level: **${data.analysis.threatLevel.toUpperCase()}**\n> Risk: **${data.analysis.risk}**/100 | Trust: **${data.analysis.trust}**\n${indicators}`;
        }).join('\n\n');

        embed.addFields({
          name: `🚨 Detected Threats (${threats.length})`,
          value: threatList.substring(0, 1024) || 'None',
          inline: false
        });
      }

      const threatSummary = {
        critical: threats.filter(t => t.analysis.threatLevel === 'critical').length,
        high: threats.filter(t => t.analysis.threatLevel === 'high').length,
        medium: threats.filter(t => t.analysis.threatLevel === 'medium').length,
        low: threats.filter(t => t.analysis.threatLevel === 'low').length
      };

      embed.addFields({
        name: '📊 Threat Summary',
        value: `🔴 Critical: **${threatSummary.critical}**\n🟠 High: **${threatSummary.high}**\n🟡 Medium: **${threatSummary.medium}**\n🟢 Low: **${threatSummary.low}**`,
        inline: true
      });

      embed.addFields({
        name: '👥 Staff Scanned',
        value: `**${staffMembers.size}** members with elevated permissions`,
        inline: true
      });

      if (threats.length > 0) {
        const recommendations = [];
        if (threatSummary.critical > 0) recommendations.push('IMMEDIATE: Review critical threat staff members');
        if (threatSummary.high > 0) recommendations.push('HIGH: Monitor high-threat staff closely');
        if (threatSummary.medium > 0) recommendations.push('MEDIUM: Watch for patterns in medium-threat staff');
        recommendations.push('Consider rotating permissions periodically');
        recommendations.push('Review audit logs for suspicious staff activity');

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
        .setDescription('Failed to perform insider threat analysis.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};