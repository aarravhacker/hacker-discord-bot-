const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilinkanalytics')
    .setDescription('Link analytics and statistics')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('period')
        .setDescription('Analytics period')
        .setRequired(true)
        .addChoices(
          { name: 'Last 24 Hours', value: '24h' },
          { name: 'Last 7 Days', value: '7d' },
          { name: 'Last 30 Days', value: '30d' }
        )
    ),
  cooldown: 5,
  aliases: ['alanalytics'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    const period = isSlash
      ? interaction.options.getString('period')
      : (args[0] || '7d');

    const analytics = await securityEngine.getLinkAnalytics(interaction.guild.id, period);

    const embed = new EmbedBuilder()
      .setTitle('Link Analytics')
      .setDescription(`Link analytics for **${interaction.guild.name}** (${period})`)
      .setColor(0x0099ff)
      .addFields(
        { name: 'Total Links Shared', value: `\`${analytics.totalLinks || 0}\``, inline: true },
        { name: 'Unique Domains', value: `\`${analytics.uniqueDomains || 0}\``, inline: true },
        { name: 'Malicious Links', value: `\`${analytics.maliciousLinks || 0}\``, inline: true },
        { name: 'Blocked Links', value: `\`${analytics.blockedLinks || 0}\``, inline: true },
        { name: 'Top Domain', value: `\`${analytics.topDomain || 'N/A'}\``, inline: true },
        { name: 'Peak Hour', value: `\`${analytics.peakHour || 'N/A'}\``, inline: true }
      );

    if (analytics.topDomains && analytics.topDomains.length > 0) {
      const domainList = analytics.topDomains.slice(0, 5).map((d, i) => `**${i + 1}.** ${d.domain} - ${d.count} links`).join('\n');
      embed.addFields({ name: 'Top Domains', value: domainList });
    }

    if (analytics.hourlyBreakdown && analytics.hourlyBreakdown.length > 0) {
      const hourlyList = analytics.hourlyBreakdown.slice(0, 6).map(h => `${h.hour}: \`${h.count}\` links`).join('\n');
      embed.addFields({ name: 'Hourly Breakdown', value: hourlyList });
    }

    if (analytics.categoryBreakdown) {
      const categories = Object.entries(analytics.categoryBreakdown).map(([cat, count]) => `• **${cat}**: ${count}`).join('\n');
      if (categories) {
        embed.addFields({ name: 'Category Breakdown', value: categories });
      }
    }

    embed.addFields({ name: 'Period', value: period, inline: true });
    embed.setFooter({ text: `Requested by ${user.tag}` }).setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
