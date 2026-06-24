const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukestatus2')
    .setDescription('Detailed status with metrics')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  cooldown: 10,
  aliases: ['anstatus2', 'astatus2'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('Permission Denied')
        .setDescription('You need Administrator permission to use this command.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      await interaction.deferReply();
      const status = securityEngine.getDetailedStatus(interaction.guild.id);

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Antinuke Detailed Status')
        .setDescription(`Detailed status for **${interaction.guild.name}**`)
        .addFields(
          { name: 'Status', value: status?.active ? 'Active' : 'Inactive', inline: true },
          { name: 'Mode', value: status?.mode || 'Not set', inline: true },
          { name: 'Events Today', value: String(status?.eventsToday || 0), inline: true },
          { name: 'Threats Blocked Today', value: String(status?.threatsBlockedToday || 0), inline: true },
          { name: 'Last Incident', value: status?.lastIncident ? new Date(status.lastIncident.timestamp || status.lastIncident).toLocaleString() : 'None', inline: true }
        )
        .setTimestamp();

      if (status?.metrics) {
        embed.addFields(
          { name: 'Performance Metrics', value: '\u200b', inline: false },
          { name: 'Total Incidents', value: String(status.metrics.totalIncidents || 0), inline: true },
          { name: 'Total Events', value: String(status.metrics.totalEvents || 0), inline: true },
          { name: 'Risk Score', value: String(status.metrics.riskScore || 0), inline: true }
        );
      }

      if (status?.protections) {
        embed.addFields(
          { name: 'Active Protections', value: '\u200b', inline: false },
          { name: 'Channels', value: status.protections.channels ? 'On' : 'Off', inline: true },
          { name: 'Roles', value: status.protections.roles ? 'On' : 'Off', inline: true },
          { name: 'Members', value: status.protections.members ? 'On' : 'Off', inline: true },
          { name: 'Permissions', value: status.protections.permissions ? 'On' : 'Off', inline: true }
        );
      }

      if (status?.recentActivity?.length) {
        const activity = status.recentActivity.slice(0, 5).map(a =>
          `\`${new Date(a.timestamp).toLocaleString()}\` ${a.type || 'unknown'}`
        ).join('\n');
        embed.addFields({ name: 'Recent Activity', value: activity });
      }

      embed.addFields({ name: 'Checked By', value: user.tag, inline: false });
      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('Status Error')
        .setDescription(`Failed to get status: ${error.message}`)
        .setTimestamp();
      if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
      }
      return interaction.reply({ embeds: [embed] });
    }
  }
};
