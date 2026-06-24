const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('behaviorpatterns')
    .setDescription('View learned behavioral patterns')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['bpatterns', 'learnedpatterns'],
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

      const hourDistribution = new Map();
      const channelActivity = new Map();
      let totalMessages = 0;
      let totalEdits = 0;
      let totalDeletes = 0;
      let activeUsers = 0;
      const burstPatterns = [];

      for (const profile of profiles) {
        totalMessages += profile.messageCount;
        totalEdits += profile.editCount;
        totalDeletes += profile.deleteCount || 0;
        if (profile.messageCount > 0) activeUsers++;

        for (const [hour, count] of profile.typicalHours) {
          hourDistribution.set(hour, (hourDistribution.get(hour) || 0) + count);
        }

        for (const channelId of profile.typicalChannels) {
          channelActivity.set(channelId, (channelActivity.get(channelId) || 0) + 1);
        }

        if (profile.burstCount > 5) {
          burstPatterns.push({
            userId: profile.userId,
            burstCount: profile.burstCount
          });
        }
      }

      const sortedHours = [...hourDistribution.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      const sortedChannels = [...channelActivity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      burstPatterns.sort((a, b) => b.burstCount - a.burstCount);

      const peakHour = sortedHours[0];
      const quietHours = [...hourDistribution.entries()].sort((a, b) => a[1] - b[1]).slice(0, 3);

      const embed = new EmbedBuilder()
        .setTitle('📊 Behavioral Patterns')
        .setDescription(`Learned behavioral patterns for **${guild.name}**.`)
        .setColor(0x5865f2)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
        .addFields(
          { name: '👥 Active Profiles', value: `${profiles.length}`, inline: true },
          { name: '💬 Total Messages', value: `${totalMessages}`, inline: true },
          { name: '✏️ Total Edits', value: `${totalEdits}`, inline: true },
          { name: '🗑️ Total Deletes', value: `${totalDeletes}`, inline: true },
          { name: '👤 Active Users', value: `${activeUsers}`, inline: true },
          { name: '📊 Avg Messages/User', value: `${activeUsers > 0 ? (totalMessages / activeUsers).toFixed(1) : 0}`, inline: true }
        );

      if (peakHour) {
        embed.addFields({
          name: '🕐 Peak Activity Hour',
          value: `**${peakHour[0]}:00** — ${peakHour[1]} total actions`,
          inline: false
        });
      }

      if (quietHours.length > 0) {
        const quietList = quietHours.map(([h, count]) => `${h}:00 (${count})`).join(', ');
        embed.addFields({ name: '🌙 Quietest Hours', value: quietList, inline: false });
      }

      if (sortedChannels.length > 0) {
        const channelList = sortedChannels.map(([id, count]) =>
          `<#${id}> — ${count} active users`
        ).join('\n');
        embed.addFields({ name: '📍 Most Active Channels', value: channelList, inline: false });
      } else {
        embed.addFields({ name: '📍 Most Active Channels', value: 'No channel activity data available.', inline: false });
      }

      if (burstPatterns.length > 0) {
        const burstList = burstPatterns.slice(0, 5).map(b =>
          `• <@${b.userId}> — Burst: **${b.burstCount}**`
        ).join('\n');
        embed.addFields({ name: '⚡ Burst Activity', value: burstList, inline: false });
      } else {
        embed.addFields({ name: '⚡ Burst Activity', value: 'No significant burst activity detected.', inline: false });
      }

      securityEngine.logIncident(guild.id, user.id, 'behavior_patterns_viewed', {
        profiles: profiles.length,
        totalMessages,
        activeUsers
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to load behavioral patterns.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
