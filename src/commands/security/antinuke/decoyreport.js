const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('decoyreport')
    .setDescription('Decoy activity report')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['decoyrpt', 'dreport'],
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

      const decoys = securityEngine.getDecoys(guild.id);
      const incidents = securityEngine.getIncidents(guild.id, 500);
      const decoyIncidents = incidents.filter(i => i.type === 'decoy_triggered');

      const triggered = decoys.filter(d => d.triggered);
      const notTriggered = decoys.filter(d => !d.triggered);

      const typeBreakdown = {};
      decoys.forEach(d => {
        typeBreakdown[d.type] = (typeBreakdown[d.type] || 0) + 1;
      });

      const triggeredByType = {};
      triggered.forEach(d => {
        triggeredByType[d.type] = (triggeredByType[d.type] || 0) + 1;
      });

      let color = 0x00ff00;
      if (triggered.length > 0) color = 0xffa500;
      if (decoyIncidents.length > 5) color = 0xff0000;

      const embed = new EmbedBuilder()
        .setTitle('🪤 Decoy Activity Report')
        .setDescription(`Comprehensive decoy report for **${guild.name}**.`)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      embed.addFields({
        name: '📊 Overview',
        value: `Total Decoys: **${decoys.length}**\nActive: **${notTriggered.length}**\nTriggered: **${triggered.length}**\nTotal Trigger Events: **${decoyIncidents.length}**`,
        inline: true
      });

      if (Object.keys(typeBreakdown).length > 0) {
        const breakdown = Object.entries(typeBreakdown)
          .map(([type, count]) => `• **${type}**: ${count} total, ${triggeredByType[type] || 0} triggered`)
          .join('\n');

        embed.addFields({
          name: '📋 Type Breakdown',
          value: breakdown,
          inline: true
        });
      }

      if (decoyIncidents.length > 0) {
        const recentTriggers = decoyIncidents.slice(0, 8).map(inc => {
          return `• ${inc.details.type} triggered by user \`${inc.userId}\` — <t:${Math.floor(inc.timestamp / 1000)}:R>`;
        }).join('\n');

        embed.addFields({
          name: '🕐 Recent Trigger Events',
          value: recentTriggers.substring(0, 1024),
          inline: false
        });
      }

      const effectiveness = decoys.length > 0
        ? Math.round((triggered.length / decoys.length) * 100)
        : 0;

      embed.addFields({
        name: '📈 Effectiveness',
        value: `Trigger Rate: **${effectiveness}%**\n${effectiveness > 50 ? '⚠️ High trigger rate — possible targeted reconnaissance' : '✅ Normal trigger rate'}`,
        inline: false
      });

      if (triggered.length > 0) {
        const recommendations = [
          'Investigate users who triggered decoys',
          'Consider adding more decoys in targeted areas',
          'Review permissions of triggering users',
          'Check for coordinated activity patterns'
        ];

        embed.addFields({
          name: '💡 Recommendations',
          value: recommendations.map(r => `• ${r}`).join('\n'),
          inline: false
        });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while generating the decoy report.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
