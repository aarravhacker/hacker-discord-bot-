const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdownpatterns')
    .setDescription('View lockdown patterns and trends')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['ldpatterns', 'lockdowntrends'],
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
      const incidents = securityEngine.getIncidents(guild.id, 200);

      const hourBuckets = new Map();
      const dayBuckets = new Map();
      const typeCounts = new Map();
      let totalLockdownEvents = 0;

      for (const inc of incidents) {
        const date = new Date(inc.timestamp);
        const hour = date.getHours();
        const day = date.toLocaleDateString();
        const type = inc.type;

        hourBuckets.set(hour, (hourBuckets.get(hour) || 0) + 1);
        dayBuckets.set(day, (dayBuckets.get(day) || 0) + 1);
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);

        if (inc.type.includes('lockdown') || inc.type.includes('freeze')) {
          totalLockdownEvents++;
        }
      }

      let peakHour = 0;
      let peakCount = 0;
      for (const [hour, count] of hourBuckets) {
        if (count > peakCount) {
          peakHour = hour;
          peakCount = count;
        }
      }

      let peakDay = '';
      let peakDayCount = 0;
      for (const [day, count] of dayBuckets) {
        if (count > peakDayCount) {
          peakDay = day;
          peakDayCount = count;
        }
      }

      const sortedTypes = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      const typeList = sortedTypes.map(([type, count]) => `• **${type}**: ${count}`).join('\n') || 'No data';

      const embed = new EmbedBuilder()
        .setTitle('📊 Lockdown Patterns')
        .setDescription('Analysis of lockdown patterns and trends.')
        .setColor(0x5865f2)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
        .addFields(
          { name: 'Total Incidents', value: `${incidents.length}`, inline: true },
          { name: 'Lockdown Events', value: `${totalLockdownEvents}`, inline: true },
          { name: 'Peak Hour', value: `${peakHour}:00 (${peakCount} events)`, inline: true },
          { name: 'Peak Day', value: peakDay || 'N/A', inline: true },
          { name: '📈 Most Common Events', value: typeList, inline: false }
        );

      if (incidents.length >= 3) {
        const recentTrend = incidents.slice(0, 10);
        const olderTrend = incidents.slice(10, 20);
        const recentRate = recentTrend.length / 10;
        const olderRate = olderTrend.length / 10;

        let trendEmoji = '➡️';
        if (recentRate > olderRate * 1.5) trendEmoji = '📈';
        else if (recentRate < olderRate * 0.5) trendEmoji = '📉';

        embed.addFields({
          name: '📉 Trend',
          value: `${trendEmoji} Incident rate is ${recentRate > olderRate ? 'increasing' : recentRate < olderRate ? 'decreasing' : 'stable'}.`,
          inline: false
        });
      }

      securityEngine.logIncident(guild.id, user.id, 'lockdown_patterns_viewed', {
        totalIncidents: incidents.length,
        lockdownEvents: totalLockdownEvents
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to analyze lockdown patterns.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
