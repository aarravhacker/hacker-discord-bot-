const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auditsearch')
    .setDescription('Search audit logs with filters')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('query').setDescription('Search query')
    )
    .addStringOption(opt =>
      opt.setName('type').setDescription('Filter by incident type')
    )
    .addUserOption(opt =>
      opt.setName('user').setDescription('Filter by user')
    )
    .addStringOption(opt =>
      opt.setName('severity').setDescription('Filter by severity')
        .addChoices(
          { name: 'Low', value: 'low' },
          { name: 'Medium', value: 'medium' },
          { name: 'High', value: 'high' },
          { name: 'Critical', value: 'critical' }
        )
    ),
  cooldown: 5,
  aliases: ['asearch', 'alog'],
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

      const query = isSlash ? interaction.options.getString('query') : (args[0] || '');
      const typeFilter = isSlash ? interaction.options.getString('type') : (args[1] || '');
      const userFilter = isSlash ? interaction.options.getUser('user') : null;
      const severityFilter = isSlash ? interaction.options.getString('severity') : (args[2] || '');

      let incidents = securityEngine.getIncidents(guild.id, 1000);

      if (query) {
        const q = query.toLowerCase();
        incidents = incidents.filter(i =>
          i.type.toLowerCase().includes(q) ||
          (i.details?.description && i.details.description.toLowerCase().includes(q)) ||
          (i.details?.reason && i.details.reason.toLowerCase().includes(q)) ||
          String(i.id).includes(q)
        );
      }

      if (typeFilter) {
        incidents = incidents.filter(i => i.type.toLowerCase().includes(typeFilter.toLowerCase()));
      }

      if (userFilter) {
        incidents = incidents.filter(i => i.userId === userFilter.id);
      }

      if (severityFilter) {
        incidents = incidents.filter(i => {
          const risk = i.details?.risk || 0;
          switch (severityFilter) {
            case 'critical': return risk > 80;
            case 'high': return risk > 50 && risk <= 80;
            case 'medium': return risk > 25 && risk <= 50;
            case 'low': return risk <= 25;
            default: return true;
          }
        });
      }

      const totalBeforeFilter = securityEngine.getIncidents(guild.id, 1000).length;

      let color = 0x0099ff;
      if (incidents.length > 20) color = 0xffa500;
      if (incidents.length > 50) color = 0xff0000;

      const embed = new EmbedBuilder()
        .setTitle('🔍 Audit Log Search')
        .setDescription(`Found **${incidents.length}** results out of **${totalBeforeFilter}** total incidents.`)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      const filters = [];
      if (query) filters.push(`Query: "${query}"`);
      if (typeFilter) filters.push(`Type: ${typeFilter}`);
      if (userFilter) filters.push(`User: ${userFilter.tag}`);
      if (severityFilter) filters.push(`Severity: ${severityFilter}`);

      if (filters.length > 0) {
        embed.addFields({
          name: '📋 Active Filters',
          value: filters.join(' | '),
          inline: false
        });
      }

      if (incidents.length > 0) {
        const resultList = incidents.slice(0, 15).map(inc => {
          const icon = inc.type.includes('anomaly') ? '⚠️' :
            inc.type.includes('decoy') ? '🪤' :
              inc.type.includes('trust') ? '🤝' :
                inc.type.includes('freeze') ? '❄️' : '📋';
          const member = inc.userId !== 'system' ? guild.members.cache.get(inc.userId) : null;
          return `${icon} **#${inc.id}** ${inc.type} — <t:${Math.floor(inc.timestamp / 1000)}:R>\n> ${member ? member.user.tag : inc.userId || 'System'} | ${securityEngine.explainThreat(inc).substring(0, 80)}`;
        }).join('\n\n');

        embed.addFields({
          name: '📋 Results',
          value: resultList.substring(0, 2048),
          inline: false
        });
      } else {
        embed.addFields({
          name: '📭 No Results',
          value: 'No incidents matched your search criteria.',
          inline: false
        });
      }

      if (incidents.length > 15) {
        embed.addFields({
          name: '📄 Pagination',
          value: `Showing 15 of ${incidents.length} results. Refine your search for more specific results.`,
          inline: false
        });
      }

      const typeStats = {};
      incidents.forEach(inc => {
        typeStats[inc.type] = (typeStats[inc.type] || 0) + 1;
      });

      if (Object.keys(typeStats).length > 0) {
        const statsList = Object.entries(typeStats)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([type, count]) => `• **${type}**: ${count}`)
          .join('\n');

        embed.addFields({
          name: '📊 Type Breakdown',
          value: statsList,
          inline: true
        });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while searching audit logs.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
