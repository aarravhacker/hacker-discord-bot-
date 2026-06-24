const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auditvisualize')
    .setDescription('Visualize audit data as a dashboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('range').setDescription('Time range')
        .addChoices(
          { name: '1 Hour', value: '1h' },
          { name: '24 Hours', value: '24h' },
          { name: '7 Days', value: '7d' },
          { name: 'All Time', value: 'all' }
        )
    ),
  cooldown: 5,
  aliases: ['avisual', 'adash'],
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

      const range = isSlash
        ? interaction.options.getString('range')
        : (args[0] || '24h').toLowerCase();

      const timeRanges = {
        '1h': 3600000,
        '24h': 86400000,
        '7d': 604800000,
        'all': Infinity
      };
      const cutoff = Date.now() - (timeRanges[range] || 86400000);

      const incidents = securityEngine.getIncidents(guild.id, 1000);
      const filteredIncidents = range === 'all' ? incidents : incidents.filter(i => i.timestamp >= cutoff);

      const typeDistribution = {};
      const hourlyDistribution = new Array(24).fill(0);
      const userActivity = {};

      filteredIncidents.forEach(inc => {
        typeDistribution[inc.type] = (typeDistribution[inc.type] || 0) + 1;
        const hour = new Date(inc.timestamp).getHours();
        hourlyDistribution[hour]++;
        if (inc.userId && inc.userId !== 'system') {
          userActivity[inc.userId] = (userActivity[inc.userId] || 0) + 1;
        }
      });

      const topUsers = Object.entries(userActivity)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));

      let color = 0x0099ff;
      if (filteredIncidents.length > 20) color = 0xffa500;
      if (filteredIncidents.length > 50) color = 0xff0000;

      const embed = new EmbedBuilder()
        .setTitle('📊 Audit Data Visualization')
        .setDescription(`Audit dashboard for **${guild.name}** — Range: **${range.toUpperCase()}**`)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      embed.addFields({
        name: '📈 Overview',
        value: `Total Incidents: **${filteredIncidents.length}**\nUnique Types: **${Object.keys(typeDistribution).length}**\nActive Users: **${Object.keys(userActivity).length}**\nPeak Hour: **${peakHour}:00**`,
        inline: true
      });

      if (Object.keys(typeDistribution).length > 0) {
        const typeList = Object.entries(typeDistribution)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 8)
          .map(([type, count]) => {
            const bar = '█'.repeat(Math.min(10, Math.ceil(count / Math.max(1, filteredIncidents.length) * 10)));
            return `**${type}**: ${count} ${bar}`;
          })
          .join('\n');

        embed.addFields({
          name: '📊 Type Distribution',
          value: typeList.substring(0, 1024),
          inline: false
        });
      }

      const activityBar = hourlyDistribution
        .map((count, hour) => {
          if (hour % 6 === 0) {
            const next6 = hourlyDistribution.slice(hour, hour + 6);
            const max = Math.max(...next6, 1);
            const bar = next6.map(c => '█'.repeat(Math.min(8, Math.ceil(c / max * 8)))).join('');
            return `${String(hour).padStart(2, '0')}: ${bar}`;
          }
          return null;
        })
        .filter(Boolean)
        .join('\n');

      if (activityBar) {
        embed.addFields({
          name: '🕐 Hourly Activity',
          value: `\`\`\`\n${activityBar}\n\`\`\``,
          inline: false
        });
      }

      if (topUsers.length > 0) {
        const userList = topUsers.map(([userId, count]) => {
          const member = guild.members.cache.get(userId);
          return `• **${member ? member.user.tag : userId}**: ${count} incident(s)`;
        }).join('\n');

        embed.addFields({
          name: '👥 Top Active Users',
          value: userList,
          inline: false
        });
      }

      const severityBreakdown = {
        critical: filteredIncidents.filter(i => i.details?.risk > 80).length,
        high: filteredIncidents.filter(i => i.details?.risk > 50 && i.details?.risk <= 80).length,
        medium: filteredIncidents.filter(i => i.details?.risk > 25 && i.details?.risk <= 50).length,
        low: filteredIncidents.filter(i => i.details?.risk <= 25).length
      };

      embed.addFields({
        name: '🎯 Severity Breakdown',
        value: `🔴 Critical: **${severityBreakdown.critical}**\n🟠 High: **${severityBreakdown.high}**\n🟡 Medium: **${severityBreakdown.medium}**\n🟢 Low: **${severityBreakdown.low}**`,
        inline: true
      });

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while visualizing audit data.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
