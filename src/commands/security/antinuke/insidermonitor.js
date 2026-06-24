const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('insidermonitor')
    .setDescription('Real-time insider monitor dashboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['insidermon', 'imon'],
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

      const incidents = securityEngine.getIncidents(guild.id, 100);
      const recentIncidents = incidents.filter(i => Date.now() - i.timestamp < 3600000);
      const decoys = securityEngine.getDecoys(guild.id);
      const triggeredDecoys = decoys.filter(d => d.triggered);
      const stage = securityEngine.getStage(guild.id);
      const joinVelocity = securityEngine.analyzeJoinVelocity(guild.id, 300000);

      const highRiskStaff = [];
      guild.members.cache.forEach(m => {
        if (m.user.bot) return;
        if (m.permissions.has(PermissionFlagsBits.Administrator) ||
          m.permissions.has(PermissionFlagsBits.ManageGuild) ||
          m.permissions.has(PermissionFlagsBits.ManageRoles)) {
          const risk = securityEngine.calculateRisk(guild.id, m.id);
          if (risk > 50) {
            highRiskStaff.push({ member: m, risk });
          }
        }
      });
      highRiskStaff.sort((a, b) => b.risk - a.risk);

      let color = 0x57f287;
      if (stage.stage >= 4) color = 0xff0000;
      else if (stage.stage >= 2) color = 0xffa500;
      else if (recentIncidents.length > 5 || highRiskStaff.length > 0) color = 0xffff00;

      const embed = new EmbedBuilder()
        .setTitle('🕵️ Insider Monitor Dashboard')
        .setDescription('Real-time insider threat monitoring overview.')
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      embed.addFields({
        name: '🛡️ Security Stage',
        value: `**Stage ${stage.stage}:** ${stage.name}`,
        inline: true
      });

      embed.addFields({
        name: '📊 Recent Activity (1h)',
        value: `Incidents: **${recentIncidents.length}**\nTotal Incidents: **${incidents.length}**`,
        inline: true
      });

      embed.addFields({
        name: '🪤 Decoy Status',
        value: `Active: **${decoys.length}**\nTriggered: **${triggeredDecoys.length}**`,
        inline: true
      });

      embed.addFields({
        name: '📈 Join Velocity',
        value: `Rate: **${joinVelocity.velocity.toFixed(1)}**/min\nStatus: ${joinVelocity.isRapid ? '⚠️ RAPID' : '✅ Normal'}`,
        inline: true
      });

      if (highRiskStaff.length > 0) {
        const staffList = highRiskStaff.slice(0, 8).map((s, i) =>
          `**${i + 1}.** ${s.member.user.tag} — Risk: **${s.risk}**/100`
        ).join('\n');
        embed.addFields({
          name: '⚠️ High Risk Staff',
          value: staffList.substring(0, 1024),
          inline: false
        });
      } else {
        embed.addFields({
          name: '✅ Staff Risk',
          value: 'No staff members currently above high risk threshold.',
          inline: false
        });
      }

      if (triggeredDecoys.length > 0) {
        const decoyList = triggeredDecoys.slice(0, 5).map(d =>
          `• ${d.type} — Triggered <t:${Math.floor(d.created / 1000)}:R>`
        ).join('\n');
        embed.addFields({
          name: '🪤 Triggered Decoys',
          value: decoyList.substring(0, 1024),
          inline: false
        });
      }

      const recentAlerts = recentIncidents
        .filter(i => i.type === 'anomaly_detected' || i.type === 'decoy_triggered')
        .slice(0, 5);

      if (recentAlerts.length > 0) {
        const alertList = recentAlerts.map(a =>
          `• ${securityEngine.explainThreat(a)}`
        ).join('\n');
        embed.addFields({
          name: '🔔 Recent Alerts',
          value: alertList.substring(0, 1024),
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while loading the insider monitor.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
