const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilinkreport')
    .setDescription('Link activity report')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('period')
        .setDescription('Report period')
        .setRequired(true)
        .addChoices(
          { name: 'Last 24 Hours', value: '24h' },
          { name: 'Last 7 Days', value: '7d' },
          { name: 'Last 30 Days', value: '30d' },
          { name: 'All Time', value: 'all' }
        )
    ),
  cooldown: 5,
  aliases: ['alreport'],
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

    const report = await securityEngine.generateLinkReport(interaction.guild.id, period);

    const embed = new EmbedBuilder()
      .setTitle('Link Activity Report')
      .setDescription(`Link report for **${interaction.guild.name}** (${period})`)
      .setColor(0x0099ff)
      .addFields(
        { name: 'Total Links Scanned', value: `\`${report.totalLinks || 0}\``, inline: true },
        { name: 'Malicious Links', value: `\`${report.maliciousLinks || 0}\``, inline: true },
        { name: 'Suspicious Links', value: `\`${report.suspiciousLinks || 0}\``, inline: true },
        { name: 'Links Blocked', value: `\`${report.linksBlocked || 0}\``, inline: true },
        { name: 'Links Deleted', value: `\`${report.linksDeleted || 0}\``, inline: true },
        { name: 'Unique Domains', value: `\`${report.uniqueDomains || 0}\``, inline: true }
      );

    if (report.topThreats && report.topThreats.length > 0) {
      const threatList = report.topThreats.slice(0, 5).map((t, i) => `**${i + 1}.** ${t.type || 'Unknown'} - ${t.count || 0} occurrences`).join('\n');
      embed.addFields({ name: 'Top Threats', value: threatList });
    }

    if (report.timeline && report.timeline.length > 0) {
      const timelineList = report.timeline.slice(-5).map(t => {
        const time = t.timestamp ? `<t:${Math.floor(new Date(t.timestamp).getTime() / 1000)}:R>` : 'N/A';
        return `${time} - ${t.event || 'Unknown event'}`;
      }).join('\n');
      embed.addFields({ name: 'Recent Timeline', value: timelineList });
    }

    embed.addFields({ name: 'Report Generated', value: `<t:${Math.floor(Date.now() / 1000)}:R>` });
    embed.setFooter({ text: `Requested by ${user.tag}` }).setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
