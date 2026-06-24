const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraidreport')
    .setDescription('Generate raid report')
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
  aliases: ['arreport'],
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

    const report = await securityEngine.generateRaidReport(interaction.guild.id, period);

    const embed = new EmbedBuilder()
      .setTitle('Raid Protection Report')
      .setDescription(`Raid report for **${interaction.guild.name}** (${period})`)
      .setColor(0x0099ff)
      .addFields(
        { name: 'Total Raids', value: `\`${report.totalRaids || 0}\``, inline: true },
        { name: 'Accounts Banned', value: `\`${report.totalBans || 0}\``, inline: true },
        { name: 'Accounts Kicked', value: `\`${report.totalKicks || 0}\``, inline: true },
        { name: 'Accounts Muted', value: `\`${report.totalMutes || 0}\``, inline: true },
        { name: 'Links Blocked', value: `\`${report.linksBlocked || 0}\``, inline: true },
        { name: 'Avg Response Time', value: `\`${report.avgResponseTime || 0}ms\``, inline: true }
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
