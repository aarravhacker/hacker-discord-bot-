const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trustmonitor')
    .setDescription('Real-time trust monitor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['trmonitor', 'trustwatch'],
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
      const incidents = securityEngine.getIncidents(guild.id, 50);
      const trustChanges = incidents.filter(i => i.type === 'trust_modified');

      const recentChanges = trustChanges.slice(0, 5);
      const last24h = trustChanges.filter(i => Date.now() - i.timestamp < 86400000);
      const last1h = trustChanges.filter(i => Date.now() - i.timestamp < 3600000);

      let flaggedUsers = 0;
      let trustedUsers = 0;
      let totalProfiles = 0;

      guild.members.cache.forEach((m) => {
        if (m.user.bot) return;
        totalProfiles++;
        const trustLevel = securityEngine.getTrustLevel(guild.id, m.id);
        if (trustLevel.isFlagged) flaggedUsers++;
        if (trustLevel.isTrusted) trustedUsers++;
      });

      const alertSettings = securityEngine.profiles.get(`trustAlert:${guild.id}`) || {
        threshold: 20,
        enabled: false
      };

      const embed = new EmbedBuilder()
        .setTitle('🔍 Trust Monitor')
        .setDescription('Real-time trust system monitoring dashboard.')
        .setColor(flaggedUsers > 3 ? 0xed4245 : flaggedUsers > 0 ? 0xffa500 : 0x57f287)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
        .addFields(
          { name: '👥 Total Profiles', value: `${totalProfiles}`, inline: true },
          { name: '✅ Trusted Users', value: `${trustedUsers}`, inline: true },
          { name: '⚠️ Flagged Users', value: `${flaggedUsers}`, inline: true },
          { name: '🔔 Alerts Enabled', value: alertSettings.enabled ? '✅ Yes' : '❌ No', inline: true },
          { name: '📊 Alert Threshold', value: `${alertSettings.threshold}/100`, inline: true },
          { name: '📈 Changes (24h)', value: `${last24h.length}`, inline: true }
        );

      if (recentChanges.length > 0) {
        const changeList = recentChanges.map((inc) => {
          const amount = inc.details.amount || 0;
          const emoji = amount > 0 ? '📈' : '📉';
          return `${emoji} <@${inc.userId}> — **${amount > 0 ? '+' : ''}${amount}** (${inc.details.reason || 'No reason'})\n> <t:${Math.floor(inc.timestamp / 1000)}:R>`;
        }).join('\n\n');
        embed.addFields({ name: '📜 Recent Trust Changes', value: changeList, inline: false });
      } else {
        embed.addFields({ name: '📜 Recent Trust Changes', value: 'No recent trust changes.', inline: false });
      }

      if (flaggedUsers > 0) {
        const flaggedList = [];
        guild.members.cache.forEach((m) => {
          if (m.user.bot) return;
          const trustLevel = securityEngine.getTrustLevel(guild.id, m.id);
          if (trustLevel.isFlagged) {
            flaggedList.push(`⚠️ ${m.user.tag} — Score: **${trustLevel.score}** (${trustLevel.flagReason || 'No reason'})`);
          }
        });

        if (flaggedList.length > 0) {
          embed.addFields({ name: '🚨 Flagged Users', value: flaggedList.slice(0, 5).join('\n'), inline: false });
        }
      }

      securityEngine.logIncident(guild.id, user.id, 'trust_monitor_viewed', {
        totalProfiles,
        flaggedUsers,
        trustedUsers,
        changes24h: last24h.length
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to load trust monitor.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
