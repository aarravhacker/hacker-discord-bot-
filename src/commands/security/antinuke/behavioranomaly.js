const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('behavioranomaly')
    .setDescription('View detected behavioral anomalies')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('limit').setDescription('Number of anomalies to show (1-30)').setMinValue(1).setMaxValue(30)
    )
    .addStringOption(opt =>
      opt.setName('severity')
        .setDescription('Filter by severity')
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Critical', value: 'critical' },
          { name: 'High', value: 'high' },
          { name: 'Medium', value: 'medium' },
          { name: 'Low', value: 'low' }
        )
    ),
  cooldown: 5,
  aliases: ['banomaly', 'anomalies'],
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

    const limit = isSlash ? (interaction.options.getInteger('limit') || 15) : parseInt(args[0]) || 15;
    const severity = isSlash ? (interaction.options.getString('severity') || 'all') : (args[1] || 'all').toLowerCase();

    try {
      const allAnomalies = [];
      guild.members.cache.forEach((m) => {
        if (m.user.bot) return;
        const profile = securityEngine.getProfile(guild.id, m.id);
        if (profile.anomalies.length > 0) {
          for (const anomaly of profile.anomalies) {
            allAnomalies.push({
              userId: m.id,
              userTag: m.user.tag,
              ...anomaly
            });
          }
        }
      });

      let filteredAnomalies = allAnomalies;
      if (severity !== 'all') {
        filteredAnomalies = allAnomalies.filter(a => a.severity === severity);
      }

      filteredAnomalies.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
      });

      const displayAnomalies = filteredAnomalies.slice(0, limit);

      const severityCounts = {
        critical: allAnomalies.filter(a => a.severity === 'critical').length,
        high: allAnomalies.filter(a => a.severity === 'high').length,
        medium: allAnomalies.filter(a => a.severity === 'medium').length,
        low: allAnomalies.filter(a => a.severity === 'low').length
      };

      const embed = new EmbedBuilder()
        .setTitle('🔍 Behavioral Anomalies')
        .setDescription(`Found **${allAnomalies.length}** total anomalies across **${guild.name}**.`)
        .setColor(severityCounts.critical > 0 ? 0xed4245 : severityCounts.high > 0 ? 0xffa500 : 0x5865f2)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
        .addFields(
          { name: '📊 Summary', value: `🔴 Critical: **${severityCounts.critical}**\n🟠 High: **${severityCounts.high}**\n🟡 Medium: **${severityCounts.medium}**\n🟢 Low: **${severityCounts.low}**`, inline: false }
        );

      if (displayAnomalies.length > 0) {
        const anomalyList = displayAnomalies.map((a, i) => {
          const sevIcon = a.severity === 'critical' ? '🔴' : a.severity === 'high' ? '🟠' : a.severity === 'medium' ? '🟡' : '🟢';
          return `${sevIcon} **${a.type}** — <@${a.userId}>\n> Severity: ${a.severity}${a.count ? ` | Count: ${a.count}` : ''}`;
        }).join('\n\n');
        embed.addFields({ name: '🚨 Anomalies', value: anomalyList, inline: false });
      } else {
        embed.addFields({ name: '✅ No Anomalies', value: severity === 'all' ? 'No anomalies detected.' : `No ${severity} anomalies detected.`, inline: false });
      }

      const uniqueUsers = [...new Set(allAnomalies.map(a => a.userId))].length;
      embed.addFields({
        name: '👥 Affected Users',
        value: `**${uniqueUsers}** unique user(s) with anomalies.`,
        inline: false
      });

      securityEngine.logIncident(guild.id, user.id, 'anomaly_report_viewed', {
        totalAnomalies: allAnomalies.length,
        severity,
        affectedUsers: uniqueUsers
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to load behavioral anomalies.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
