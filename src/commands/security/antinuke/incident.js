const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('incident')
    .setDescription('Manage security incidents')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Show recent incidents')
        .addIntegerOption(opt =>
          opt.setName('limit').setDescription('Number of incidents to show').setMinValue(1).setMaxValue(50)
        )
    )
    .addSubcommand(sub =>
      sub.setName('resolve')
        .setDescription('Mark an incident as resolved')
        .addStringOption(opt =>
          opt.setName('id').setDescription('Incident ID').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('details')
        .setDescription('Show incident details')
        .addStringOption(opt =>
          opt.setName('id').setDescription('Incident ID').setRequired(true)
        )
    ),
  cooldown: 5,
  aliases: ['incidents', 'inc'],
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

    if (subcommand === 'list') {
      const limit = isSlash
        ? (interaction.options.getInteger('limit') || 10)
        : (parseInt(args[1]) || 10);

      const incidents = await securityEngine.getIncidents(interaction.guild.id);
      const list = (incidents || []).slice(0, limit);

      const severityColors = {
        critical: 0xed4245,
        high: 0xffa500,
        medium: 0xfee75c,
        low: 0x57f287
      };

      const embed = new EmbedBuilder()
        .setColor(list.length > 0 ? 0xffa500 : 0x57f287)
        .setTitle(`Recent Incidents (Last ${limit})`)
        .setDescription(list.length > 0 ? 'Security incidents:' : 'No incidents found.')
        .setTimestamp();

      if (list.length > 0) {
        embed.addFields(
          list.map(inc => {
            const sevColor = severityColors[inc.severity] || 0xffa500;
            const status = inc.resolved ? '✅' : '🔴';
            return {
              name: `${status} ${inc.type || 'Unknown'} — \`${inc.id}\``,
              value: `Severity: **${(inc.severity || 'medium').toUpperCase()}** | <t:${Math.floor((inc.timestamp || Date.now()) / 1000)}:R>\n> ${inc.description || 'No description'}`,
              inline: false
            };
          })
        );
      }

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'resolve') {
      const id = isSlash
        ? interaction.options.getString('id')
        : (args[1] || '');

      if (!id) {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('Please provide an incident ID to resolve.');
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

      if (incident.resolved) {
        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setDescription(`Incident \`${id}\` is already resolved.`);
        return interaction.reply({ embeds: [embed] });
      }

      await securityEngine.resolveIncident(interaction.guild.id, id, user.tag);

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('Incident Resolved')
        .setDescription(`Incident \`${id}\` has been marked as resolved.`)
        .addFields(
          { name: 'Type', value: incident.type || 'Unknown', inline: true },
          { name: 'Resolved By', value: `${user.tag}`, inline: true },
          { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'details') {
      const id = isSlash
        ? interaction.options.getString('id')
        : (args[1] || '');

      if (!id) {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('Please provide an incident ID to view details.');
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
        .setTitle(`Incident Details: ${incident.type || 'Unknown'}`)
        .setDescription(incident.description || 'No description available.')
        .addFields(
          { name: 'Incident ID', value: `\`${incident.id}\``, inline: true },
          { name: 'Severity', value: (incident.severity || 'medium').toUpperCase(), inline: true },
          { name: 'Status', value: incident.resolved ? '✅ Resolved' : '🔴 Active', inline: true },
          { name: 'Timestamp', value: `<t:${Math.floor((incident.timestamp || Date.now()) / 1000)}:F>`, inline: true },
          { name: 'Actor', value: incident.actor || 'Unknown', inline: true },
          { name: 'Target', value: incident.target || 'Unknown', inline: true }
        )
        .setTimestamp();

      if (incident.resolvedBy) {
        embed.addFields({
          name: 'Resolved By',
          value: incident.resolvedBy,
          inline: true
        });
      }

      if (incident.actions && incident.actions.length > 0) {
        embed.addFields({
          name: 'Actions Taken',
          value: incident.actions.map(a => `• ${a}`).join('\n'),
          inline: false
        });
      }

      if (incident.evidence) {
        embed.addFields({
          name: 'Evidence',
          value: `Actor ID: ${incident.evidence.actorId || 'N/A'}\nChannel: ${incident.evidence.channel || 'N/A'}`,
          inline: false
        });
      }

      return interaction.reply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setDescription('Invalid subcommand. Use `list [limit]`, `resolve <id>`, or `details <id>`.');
    return interaction.reply({ embeds: [embed] });
  }
};
