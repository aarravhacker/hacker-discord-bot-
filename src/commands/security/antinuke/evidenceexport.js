const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('evidenceexport')
    .setDescription('Export evidence data for an incident')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('id').setDescription('Incident ID').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['eexport', 'eexp'],
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
          .setDescription('Please provide an incident ID to export evidence for.');
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

      const evidenceList = global.evidenceStore?.[guild.id] || [];
      const evidence = evidenceList.find(e => String(e.incidentId) === incidentId);

      const chainList = global.evidenceChains?.[guild.id] || [];
      const chain = chainList.find(c => String(c.incidentId) === incidentId);

      const exportData = {
        exportType: 'evidence',
        exportedAt: new Date().toISOString(),
        exportedBy: user.tag,
        guildId: guild.id,
        guildName: guild.name,
        incident: {
          id: incident.id,
          type: incident.type,
          timestamp: incident.timestamp,
          userId: incident.userId,
          details: incident.details,
          resolved: incident.resolved
        },
        evidence: evidence || null,
        chainOfCustody: chain || null
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      const embed = new EmbedBuilder()
        .setTitle('📤 Evidence Export')
        .setDescription(`Evidence exported for incident **#${incident.id}**.`)
        .setColor(0x0099ff)
        .addFields(
          { name: 'Incident ID', value: `\`${incident.id}\``, inline: true },
          { name: 'Type', value: `**${incident.type}**`, inline: true },
          { name: 'Evidence', value: evidence ? '✅ Included' : '❌ Not Available', inline: true },
          { name: 'Chain of Custody', value: chain ? '✅ Included' : '❌ Not Available', inline: true },
          { name: 'Export Size', value: `**${(jsonString.length / 1024).toFixed(1)}** KB`, inline: true },
          { name: 'Exported By', value: `${user.tag}`, inline: true }
        )
        .setTimestamp();

      if (jsonString.length < 1900) {
        embed.addFields({
          name: '📋 Export Data',
          value: `\`\`\`json\n${jsonString}\n\`\`\``,
          inline: false
        });
      } else {
        embed.addFields({
          name: '📋 Export Ready',
          value: `Export data is **${(jsonString.length / 1024).toFixed(1)}** KB. Summary provided above.`,
          inline: false
        });
      }

      securityEngine.logIncident(guild.id, user.id, 'evidence_exported', {
        incidentId: incident.id,
        hasEvidence: !!evidence,
        hasChain: !!chain,
        exportSize: jsonString.length
      });

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while exporting evidence.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
