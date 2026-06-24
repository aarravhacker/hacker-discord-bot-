const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('forensics')
    .setDescription('Incident forensics and timeline')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('timeline').setDescription('Show incident timeline as a visual list')
    )
    .addSubcommand(sub =>
      sub.setName('investigate')
        .setDescription('Get details of a specific incident')
        .addStringOption(opt =>
          opt.setName('id').setDescription('Incident ID').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('evidence')
        .setDescription('Collect evidence for an incident')
        .addStringOption(opt =>
          opt.setName('id').setDescription('Incident ID').setRequired(true)
        )
    ),
  cooldown: 5,
  aliases: ['forensic', 'timeline'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription('You need Administrator permission to use this command.');
      return interaction.reply({ embeds: [embed] });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || '').toLowerCase();

    if (subcommand === 'timeline') {
      const incidents = await securityEngine.getIncidents(interaction.guild.id);
      const list = incidents || [];

      const severityColors = {
        critical: 0xed4245,
        high: 0xffa500,
        medium: 0xfee75c,
        low: 0x57f287
      };

      const embed = new EmbedBuilder()
        .setColor(list.length > 0 ? 0xffa500 : 0x57f287)
        .setTitle('Incident Timeline')
        .setDescription(list.length > 0 ? 'Recent security incidents:' : 'No incidents recorded.')
        .setTimestamp();

      if (list.length > 0) {
        const timeline = list.slice(0, 15).map((inc, i) => {
          const severity = inc.severity || 'medium';
          const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
          return `${icon} **${inc.type || 'Unknown'}** — <t:${Math.floor((inc.timestamp || Date.now()) / 1000)}:R>\n> ${inc.description || 'No description'} | ID: \`${inc.id}\``;
        }).join('\n\n');

        embed.setDescription(timeline);
      }

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'investigate') {
      const id = isSlash
        ? interaction.options.getString('id')
        : (args[1] || '');

      if (!id) {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('Please provide an incident ID to investigate.');
        return interaction.reply({ embeds: [embed] });
      }

      const incidents = await securityEngine.getIncidents(interaction.guild.id);
      const incident = (incidents || []).find(i => i.id === id);

      if (!incident) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription(`Incident \`${id}\` not found.`);
        return interaction.reply({ embeds: [embed] });
      }

      const severityColor = {
        critical: 0xed4245,
        high: 0xffa500,
        medium: 0xfee75c,
        low: 0x57f287
      }[incident.severity] || 0xffa500;

      const embed = new EmbedBuilder()
        .setColor(severityColor)
        .setTitle(`Incident Investigation: ${incident.type || 'Unknown'}`)
        .setDescription(incident.description || 'No description available.')
        .addFields(
          { name: 'Incident ID', value: `\`${incident.id}\``, inline: true },
          { name: 'Severity', value: (incident.severity || 'medium').toUpperCase(), inline: true },
          { name: 'Status', value: incident.resolved ? 'Resolved' : 'Active', inline: true },
          { name: 'Timestamp', value: `<t:${Math.floor((incident.timestamp || Date.now()) / 1000)}:F>`, inline: true },
          { name: 'Actor', value: incident.actor || 'Unknown', inline: true },
          { name: 'Target', value: incident.target || 'Unknown', inline: true }
        )
        .setTimestamp();

      if (incident.actions && incident.actions.length > 0) {
        embed.addFields({
          name: 'Actions Taken',
          value: incident.actions.map(a => `• ${a}`).join('\n'),
          inline: false
        });
      }

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'evidence') {
      const id = isSlash
        ? interaction.options.getString('id')
        : (args[1] || '');

      if (!id) {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('Please provide an incident ID to collect evidence for.');
        return interaction.reply({ embeds: [embed] });
      }

      const incidents = await securityEngine.getIncidents(interaction.guild.id);
      const incident = (incidents || []).find(i => i.id === id);

      if (!incident) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription(`Incident \`${id}\` not found.`);
        return interaction.reply({ embeds: [embed] });
      }

      const evidence = incident.evidence || {};
      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle(`Evidence Collection: ${incident.type || 'Unknown'}`)
        .setDescription('Collected evidence for this incident:')
        .addFields(
          { name: 'Incident ID', value: `\`${incident.id}\``, inline: true },
          { name: 'Timestamp', value: `<t:${Math.floor((incident.timestamp || Date.now()) / 1000)}:F>`, inline: true },
          { name: 'Actor ID', value: evidence.actorId || incident.actor || 'Unknown', inline: true },
          { name: 'Actor Tag', value: evidence.actorTag || 'Unknown', inline: true },
          { name: 'Channel', value: evidence.channel || 'N/A', inline: true },
          { name: 'Guild', value: incident.guildId || interaction.guild.id, inline: true }
        )
        .setTimestamp();

      if (evidence.snapshot) {
        embed.addFields({
          name: 'Snapshot State',
          value: `\`\`\`json\n${JSON.stringify(evidence.snapshot, null, 2).slice(0, 1000)}\n\`\`\``,
          inline: false
        });
      }

      if (evidence.logs && evidence.logs.length > 0) {
        embed.addFields({
          name: 'Audit Logs',
          value: evidence.logs.slice(0, 10).map(l => `• ${l}`).join('\n'),
          inline: false
        });
      }

      return interaction.reply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setDescription('Invalid subcommand. Use `timeline`, `investigate <id>`, or `evidence <id>`.');
    return interaction.reply({ embeds: [embed] });
  }
};
