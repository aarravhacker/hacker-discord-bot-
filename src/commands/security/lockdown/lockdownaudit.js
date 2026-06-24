const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdownaudit')
    .setDescription('View lockdown audit log')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('limit').setDescription('Number of entries to show (1-50)').setMinValue(1).setMaxValue(50)
    )
    .addStringOption(opt =>
      opt.setName('filter').setDescription('Filter by event type')
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Lockdown', value: 'lockdown' },
          { name: 'Freeze', value: 'freeze' },
          { name: 'Stage Changes', value: 'stage_change' },
          { name: 'Settings', value: 'setting' }
        )
    ),
  cooldown: 5,
  aliases: ['ldaudit', 'lockdownlogview'],
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
    const filter = isSlash ? (interaction.options.getString('filter') || 'all') : (args[1] || 'all').toLowerCase();

    try {
      let incidents = securityEngine.getIncidents(guild.id, 100);

      if (filter !== 'all') {
        incidents = incidents.filter(i => {
          switch (filter) {
            case 'lockdown': return i.type.includes('lockdown');
            case 'freeze': return i.type.includes('freeze');
            case 'stage_change': return i.type.includes('stage');
            case 'setting': return i.type.includes('setting') || i.type.includes('config');
            default: return true;
          }
        });
      }

      const displayIncidents = incidents.slice(0, limit);

      const embed = new EmbedBuilder()
        .setTitle('📋 Lockdown Audit Log')
        .setDescription(`Showing **${displayIncidents.length}** of **${incidents.length}** audit entries (filter: ${filter}).`)
        .setColor(0x5865f2)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      if (displayIncidents.length === 0) {
        embed.addFields({ name: 'No Entries', value: 'No audit entries found for this filter.', inline: false });
      } else {
        const entryList = displayIncidents.map((inc, i) => {
          const icon = inc.type.includes('lockdown') ? '🔒' :
            inc.type.includes('freeze') ? '🧊' :
              inc.type.includes('stage') ? '📊' :
                inc.type.includes('setting') ? '⚙️' : '📋';

          return `${icon} **${inc.type}** — <t:${Math.floor(inc.timestamp / 1000)}:R>\n> User: <@${inc.userId}> | ID: \`${inc.id || i}\``;
        }).join('\n\n');

        embed.addFields({ name: 'Audit Entries', value: entryList, inline: false });
      }

      const typeCounts = {};
      for (const inc of incidents) {
        typeCounts[inc.type] = (typeCounts[inc.type] || 0) + 1;
      }

      const topTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => `• **${type}**: ${count}`)
        .join('\n');

      if (topTypes) {
        embed.addFields({ name: '📊 Event Distribution', value: topTypes, inline: false });
      }

      securityEngine.logIncident(guild.id, user.id, 'lockdown_audit_viewed', {
        filter,
        limit,
        entriesShown: displayIncidents.length,
        totalEntries: incidents.length
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to load lockdown audit log.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
