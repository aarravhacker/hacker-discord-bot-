const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('threatexplain')
    .setDescription('AI threat explanation - explains what happened in an incident')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('id').setDescription('Incident ID to explain').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['explainthreat', 'te'],
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

    const incidentId = isSlash
      ? interaction.options.getString('id')
      : (args[0] || '');

    if (!incidentId) {
      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription('Please provide an incident ID to explain.');
      return interaction.reply({ embeds: [embed] });
    }

    const loadingEmbed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setDescription('Analyzing threat...')
      .setTimestamp();
    await interaction.reply({ embeds: [loadingEmbed] });

    try {
      const explanation = await securityEngine.explainThreat(interaction.guild.id, incidentId);

      if (!explanation) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription(`Could not find incident \`${incidentId}\` or generate explanation.`);
        return interaction.editReply({ embeds: [embed] });
      }

      const severityColor = {
        critical: 0xed4245,
        high: 0xffa500,
        medium: 0xfee75c,
        low: 0x57f287
      }[explanation.severity] || 0xffa500;

      const embed = new EmbedBuilder()
        .setColor(severityColor)
        .setTitle('AI Threat Analysis')
        .setDescription(explanation.summary || 'Threat analysis complete.')
        .addFields(
          { name: 'Incident ID', value: `\`${incidentId}\``, inline: true },
          { name: 'Type', value: explanation.type || 'Unknown', inline: true },
          { name: 'Severity', value: (explanation.severity || 'medium').toUpperCase(), inline: true },
          { name: 'What Happened', value: explanation.whatHappened || 'No details available.', inline: false },
          { name: 'Impact', value: explanation.impact || 'Unknown impact.', inline: false },
          { name: 'Recommendation', value: explanation.recommendation || 'No recommendations.', inline: false }
        )
        .setTimestamp();

      if (explanation.tactics && explanation.tactics.length > 0) {
        embed.addFields({
          name: 'Tactics Used',
          value: explanation.tactics.map(t => `• ${t}`).join('\n'),
          inline: false
        });
      }

      if (explanation.timeline && explanation.timeline.length > 0) {
        embed.addFields({
          name: 'Event Timeline',
          value: explanation.timeline.map(e => `• ${e}`).join('\n'),
          inline: false
        });
      }

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription('An error occurred while analyzing the threat.');
      return interaction.editReply({ embeds: [embed] });
    }
  }
};
