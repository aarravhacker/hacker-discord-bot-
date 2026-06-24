const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('insiderpatterns')
    .setDescription('View detected insider threat patterns')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['ipatterns', 'insiderpatterns'],
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

      const incidents = securityEngine.getIncidents(guild.id, 200);
      const patternCounts = {};
      const userPatterns = {};

      incidents.forEach(inc => {
        if (inc.type === 'anomaly_detected' && inc.details.anomalies) {
          inc.details.anomalies.forEach(a => {
            patternCounts[a.type] = (patternCounts[a.type] || 0) + 1;
            if (!userPatterns[inc.userId]) userPatterns[inc.userId] = {};
            userPatterns[inc.userId][a.type] = (userPatterns[inc.userId][a.type] || 0) + 1;
          });
        }
      });

      const sortedPatterns = Object.entries(patternCounts)
        .sort(([, a], [, b]) => b - a);

      const embed = new EmbedBuilder()
        .setTitle('🕵️ Insider Threat Patterns')
        .setDescription('Detected behavioral patterns across staff activity.')
        .setColor(sortedPatterns.length > 0 ? 0xffa500 : 0x57f287)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      if (sortedPatterns.length > 0) {
        const patternLabels = {
          burst_activity: '🔥 Burst Activity',
          unusual_hour: '🌙 Unusual Hour Activity',
          mass_channel_delete: '🗑️ Mass Channel Delete',
          mass_ban: '🔨 Mass Ban',
          permission_escalation: '⬆️ Permission Escalation',
          frequent_role_changes: '🔄 Frequent Role Changes'
        };

        const patternList = sortedPatterns.map(([type, count]) => {
          const label = patternLabels[type] || type;
          return `**${label}**: Detected **${count}** times`;
        }).join('\n');

        embed.addFields({
          name: '📊 Detected Patterns',
          value: patternList.substring(0, 1024),
          inline: false
        });

        const topOffenders = Object.entries(userPatterns)
          .map(([userId, patterns]) => {
            const totalPatterns = Object.values(patterns).reduce((a, b) => a + b, 0);
            const member = guild.members.cache.get(userId);
            return { userId, tag: member ? member.user.tag : userId, totalPatterns, patterns };
          })
          .sort((a, b) => b.totalPatterns - a.totalPatterns)
          .slice(0, 10);

        if (topOffenders.length > 0) {
          const offenderList = topOffenders.map((o, i) => {
            const patternTypes = Object.entries(o.patterns)
              .map(([type, count]) => `${type}: ${count}`)
              .join(', ');
            return `**${i + 1}.** ${o.tag} — **${o.totalPatterns}** pattern triggers (${patternTypes})`;
          }).join('\n');

          embed.addFields({
            name: '⚠️ Top Pattern Contributors',
            value: offenderList.substring(0, 1024),
            inline: false
          });
        }

        embed.addFields({
          name: '💡 Insight',
          value: `Found **${sortedPatterns.length}** unique pattern types across **${Object.keys(userPatterns).length}** staff members.`,
          inline: false
        });
      } else {
        embed.addFields({
          name: '✅ No Patterns Detected',
          value: 'No recurring insider threat patterns have been detected yet. The system is monitoring staff activity.',
          inline: false
        });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while analyzing insider patterns.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
