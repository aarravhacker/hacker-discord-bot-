const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('incidentanalyze')
    .setDescription('Analyze a specific incident in depth')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('id').setDescription('Incident ID to analyze').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['ianalyze', 'ianal'],
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

      const incidentId = isSlash ? interaction.options.getString('id') : (args[0] || '');

      if (!incidentId) {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('Please provide an incident ID to analyze.');
        return interaction.reply({ embeds: [embed] });
      }

      const incidents = securityEngine.getIncidents(guild.id, 1000);
      const incident = incidents.find(i => String(i.id) === incidentId);

      if (!incident) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription(`Incident \`${incidentId}\` not found.`);
        return interaction.reply({ embeds: [embed] });
      }

      const explanation = securityEngine.explainThreat(incident);
      const profile = incident.userId !== 'system'
        ? securityEngine.getProfile(guild.id, incident.userId)
        : null;
      const risk = incident.userId !== 'system'
        ? securityEngine.calculateRisk(guild.id, incident.userId)
        : 0;
      const trust = incident.userId !== 'system'
        ? securityEngine.getTrustLevel(guild.id, incident.userId)
        : null;

      const relatedIncidents = incidents.filter(i =>
        i.userId === incident.userId && i.id !== incident.id
      ).slice(0, 5);

      const memberData = incident.userId !== 'system'
        ? guild.members.cache.get(incident.userId)
        : null;

      let color = 0xffa500;
      if (incident.details?.risk > 80) color = 0xff0000;
      else if (incident.details?.risk > 50) color = 0xff6600;

      const embed = new EmbedBuilder()
        .setTitle(`🔍 Incident Analysis: #${incident.id}`)
        .setDescription(explanation)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      embed.addFields(
        { name: 'Incident ID', value: `\`${incident.id}\``, inline: true },
        { name: 'Type', value: `**${incident.type}**`, inline: true },
        { name: 'Timestamp', value: `<t:${Math.floor(incident.timestamp / 1000)}:F>`, inline: true },
        { name: 'Resolved', value: incident.resolved ? '✅ Yes' : '❌ No', inline: true },
        { name: 'Actor', value: memberData ? `${memberData.user.tag}` : (incident.userId || 'System'), inline: true },
        { name: 'Risk Score', value: `**${risk}**/100`, inline: true }
      );

      if (trust) {
        embed.addFields({
          name: 'Trust Profile',
          value: `Level: **${trust.label}** (${trust.score}/100)\nFlagged: ${trust.isFlagged ? '⚠️ Yes' : 'No'}`,
          inline: true
        });
      }

      if (profile) {
        embed.addFields({
          name: '📊 User Activity',
          value: `Messages: **${profile.messageCount}**\nChannel Deletes: **${profile.channelDeletes}**\nRole Changes: **${profile.roleChanges}**\nPermission Escalations: **${profile.permissionEscalations}**`,
          inline: true
        });
      }

      if (incident.details) {
        const detailsStr = Object.entries(incident.details)
          .map(([key, val]) => `• **${key}**: ${typeof val === 'object' ? JSON.stringify(val) : val}`)
          .join('\n');

        if (detailsStr) {
          embed.addFields({
            name: '📋 Incident Details',
            value: detailsStr.substring(0, 1024),
            inline: false
          });
        }
      }

      if (relatedIncidents.length > 0) {
        const relatedList = relatedIncidents.map(i =>
          `• **${i.type}** — <t:${Math.floor(i.timestamp / 1000)}:R>`
        ).join('\n');

        embed.addFields({
          name: '🔗 Related Incidents',
          value: relatedList,
          inline: false
        });
      }

      const analysis = [];
      if (risk > 80) analysis.push('🔴 User is at critical risk — immediate review recommended');
      else if (risk > 50) analysis.push('🟠 User is at high risk — monitor closely');
      else if (risk > 25) analysis.push('🟡 User is at medium risk — watch for patterns');

      if (incident.type === 'anomaly_detected' && incident.details?.anomalies) {
        incident.details.anomalies.forEach(a => {
          analysis.push(`⚠️ Anomaly: ${a.type} (severity: ${a.severity})`);
        });
      }

      if (analysis.length > 0) {
        embed.addFields({
          name: '🧠 Analysis',
          value: analysis.join('\n'),
          inline: false
        });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while analyzing the incident.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
