const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('decoyhealth')
    .setDescription('Check decoy system health')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['decoyhealth', 'dhealth'],
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
      const settings = global.decoySettings?.[guild.id] || {};
      const guardState = global.decoyGuard?.[guild.id] || {};

      const triggered = decoys.filter(d => d.triggered);
      const active = decoys.filter(d => !d.triggered);

      const typeBreakdown = {};
      decoys.forEach(d => {
        if (!typeBreakdown[d.type]) typeBreakdown[d.type] = { total: 0, triggered: 0 };
        typeBreakdown[d.type].total++;
        if (d.triggered) typeBreakdown[d.type].triggered++;
      });

      let healthScore = 100;
      if (decoys.length === 0) healthScore -= 20;
      if (triggered.length > decoys.length * 0.5) healthScore -= 20;
      if (decoyIncidents.length > 10) healthScore -= 15;
      if (!guardState.enabled) healthScore -= 5;
      if (!settings.logChannel) healthScore -= 5;
      healthScore = Math.max(0, healthScore);

      let healthColor = 0x00ff00;
      let healthLabel = 'Excellent';
      if (healthScore < 50) { healthColor = 0xff0000; healthLabel = 'Critical'; }
      else if (healthScore < 70) { healthColor = 0xff6600; healthLabel = 'Warning'; }
      else if (healthScore < 90) { healthColor = 0xffff00; healthLabel = 'Good'; }

      const embed = new EmbedBuilder()
        .setTitle('🪤 Decoy System Health')
        .setDescription(`Decoy system health: **${healthScore}/100** — ${healthLabel}`)
        .setColor(healthColor)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      embed.addFields({
        name: '📊 Overview',
        value: `Total Decoys: **${decoys.length}**\nActive: **${active.length}**\nTriggered: **${triggered.length}**\nHealth Score: **${healthScore}**/100`,
        inline: true
      });

      embed.addFields({
        name: '🛡️ Guard Status',
        value: `Mode: ${guardState.enabled ? '✅ Active' : '❌ Inactive'}\nAlerts: **${guardState.triggeredAlerts || 0}**`,
        inline: true
      });

      embed.addFields({
        name: '📋 Event Stats',
        value: `Total Trigger Events: **${decoyIncidents.length}**\nSettings: ${settings.maxDecoys ? '✅ Configured' : '⚠️ Defaults'}`,
        inline: true
      });

      if (Object.keys(typeBreakdown).length > 0) {
        const breakdown = Object.entries(typeBreakdown)
          .map(([type, data]) => `• **${type}**: ${data.total} total, ${data.triggered} triggered`)
          .join('\n');

        embed.addFields({
          name: '📋 Type Breakdown',
          value: breakdown,
          inline: false
        });
      }

      const checks = [];
      checks.push(`${decoys.length > 0 ? '✅' : '❌'} Decoys deployed`);
      checks.push(`${guardState.enabled ? '✅' : '⚠️'} Guard mode`);
      checks.push(`${triggered.length < decoys.length * 0.3 ? '✅' : '⚠️'} Trigger rate normal`);
      checks.push(`${decoyIncidents.length < 10 ? '✅' : '⚠️'} Event count normal`);
      checks.push(`${settings.logChannel ? '✅' : '⚠️'} Log channel configured`);

      embed.addFields({
        name: '🔍 Health Checks',
        value: checks.join('\n'),
        inline: false
      });

      if (triggered.length > 0) {
        embed.addFields({
          name: '⚠️ Warning',
          value: `${triggered.length} decoy(s) have been triggered. Review the decoy report for details.`,
          inline: false
        });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while checking decoy system health.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
