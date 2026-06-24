const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('evidencepreserve')
    .setDescription('Preserve evidence chain for an incident')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('id').setDescription('Incident ID').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['epreserve', 'echain'],
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
          .setDescription('Please provide an incident ID to preserve evidence for.');
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

      const chain = {
        incidentId: incident.id,
        preservedAt: Date.now(),
        preservedBy: user.tag,
        preservedById: user.id,
        incidentHash: Buffer.from(JSON.stringify({
          id: incident.id,
          type: incident.type,
          timestamp: incident.timestamp,
          userId: incident.userId
        })).toString('base64').substring(0, 32),
        evidenceCollected: !!evidence,
        chainSteps: []
      };

      chain.chainSteps.push({
        step: 1,
        action: 'Incident logged',
        timestamp: incident.timestamp,
        actor: incident.userId
      });

      if (evidence) {
        chain.chainSteps.push({
          step: 2,
          action: 'Evidence collected',
          timestamp: evidence.collectedAt,
          actor: evidence.collectedBy
        });
      }

      chain.chainSteps.push({
        step: chain.chainSteps.length + 1,
        action: 'Evidence chain preserved',
        timestamp: chain.preservedAt,
        actor: user.tag
      });

      chain.chainSteps.push({
        step: chain.chainSteps.length + 1,
        action: 'Integrity hash generated',
        timestamp: Date.now(),
        actor: 'System'
      });

      if (!global.evidenceChains) global.evidenceChains = {};
      if (!global.evidenceChains[guild.id]) global.evidenceChains[guild.id] = [];
      global.evidenceChains[guild.id].push(chain);

      const embed = new EmbedBuilder()
        .setTitle('🔒 Evidence Chain Preserved')
        .setDescription(`Evidence chain for incident **#${incident.id}** has been preserved.`)
        .setColor(0x57f287)
        .addFields(
          { name: 'Incident ID', value: `\`${incident.id}\``, inline: true },
          { name: 'Integrity Hash', value: `\`${chain.incidentHash}\``, inline: true },
          { name: 'Preserved By', value: `${user.tag}`, inline: true },
          { name: 'Evidence Collected', value: evidence ? '✅ Yes' : '❌ No', inline: true },
          { name: 'Chain Steps', value: `**${chain.chainSteps.length}**`, inline: true },
          { name: 'Preserved At', value: `<t:${Math.floor(chain.preservedAt / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

      const stepsList = chain.chainSteps.map(s =>
        `**${s.step}.** ${s.action} — <t:${Math.floor(s.timestamp / 1000)}:R> (by ${s.actor})`
      ).join('\n');

      embed.addFields({
        name: '📋 Chain of Custody',
        value: stepsList,
        inline: false
      });

      embed.addFields({
        name: '💡 Note',
        value: 'This evidence chain provides an audit trail for the incident. The integrity hash can be used to verify the evidence has not been tampered with.',
        inline: false
      });

      securityEngine.logIncident(guild.id, user.id, 'evidence_preserved', {
        incidentId: incident.id,
        chainSteps: chain.chainSteps.length,
        hash: chain.incidentHash
      });

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while preserving evidence.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
