const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recoverystatus')
    .setDescription('Check recovery system status')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['rcovstatus', 'rstatus'],
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

      const snapshots = await securityEngine.getSnapshots(guild.id);
      const latestSnapshot = securityEngine.getLatestSnapshot(guild.id);
      const backups = global.serverBackups?.[guild.id] || [];
      const autoRecovery = global.autoRecovery?.[guild.id] || {};
      const autoSnapshot = global.autoSnapshot?.[guild.id] || {};
      const stage = securityEngine.getStage(guild.id);
      const incidents = securityEngine.getIncidents(guild.id, 100);
      const recoveryIncidents = incidents.filter(i =>
        i.type === 'rollback_executed' || i.type === 'backup_restored'
      );

      let healthScore = 100;
      if ((snapshots?.length || 0) === 0) healthScore -= 20;
      if (backups.length === 0) healthScore -= 15;
      if (!autoRecovery.enabled) healthScore -= 10;
      if (!autoSnapshot.enabled) healthScore -= 5;
      if (stage.stage >= 4) healthScore -= 15;
      healthScore = Math.max(0, healthScore);

      let healthColor = 0x00ff00;
      let healthLabel = 'Excellent';
      if (healthScore < 50) { healthColor = 0xff0000; healthLabel = 'Critical'; }
      else if (healthScore < 70) { healthColor = 0xff6600; healthLabel = 'Warning'; }
      else if (healthScore < 90) { healthColor = 0xffff00; healthLabel = 'Good'; }

      const embed = new EmbedBuilder()
        .setTitle('🔄 Recovery System Status')
        .setDescription(`Recovery readiness: **${healthScore}/100** — ${healthLabel}`)
        .setColor(healthColor)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      embed.addFields({
        name: '📸 Snapshots',
        value: `Total: **${snapshots?.length || 0}**\nLatest: ${latestSnapshot ? `<t:${Math.floor(latestSnapshot.timestamp / 1000)}:R>` : 'None'}`,
        inline: true
      });

      embed.addFields({
        name: '💾 Backups',
        value: `Total: **${backups.length}**\nLatest: ${backups.length > 0 ? `<t:${Math.floor(backups[backups.length - 1].createdAt / 1000)}:R>` : 'None'}`,
        inline: true
      });

      embed.addFields({
        name: '🛡️ Auto Recovery',
        value: `Enabled: ${autoRecovery.enabled ? '✅' : '❌'}\nTotal Recoveries: **${autoRecovery.totalRecoveries || 0}**`,
        inline: true
      });

      embed.addFields({
        name: '📸 Auto Snapshot',
        value: `Enabled: ${autoSnapshot.enabled ? '✅' : '❌'}\nInterval: **${autoSnapshot.interval || 60}** min`,
        inline: true
      });

      embed.addFields({
        name: '🛡️ Current Stage',
        value: `**Stage ${stage.stage}:** ${stage.name}`,
        inline: true
      });

      embed.addFields({
        name: '📋 Recovery Events',
        value: `Total: **${recoveryIncidents.length}**`,
        inline: true
      });

      if (recoveryIncidents.length > 0) {
        const recentRecoveries = recoveryIncidents.slice(0, 5).map(i =>
          `• ${i.type === 'rollback_executed' ? 'Rollback' : 'Backup Restore'} — <t:${Math.floor(i.timestamp / 1000)}:R>`
        ).join('\n');

        embed.addFields({
          name: '🕐 Recent Recovery Events',
          value: recentRecoveries,
          inline: false
        });
      }

      const checks = [];
      checks.push(`${(snapshots?.length || 0) > 0 ? '✅' : '❌'} Snapshots available`);
      checks.push(`${backups.length > 0 ? '✅' : '❌'} Backups available`);
      checks.push(`${autoRecovery.enabled ? '✅' : '⚠️'} Auto-recovery enabled`);
      checks.push(`${autoSnapshot.enabled ? '✅' : '⚠️'} Auto-snapshot enabled`);
      checks.push(`${stage.stage === 0 ? '✅' : '⚠️'} Security stage nominal`);

      embed.addFields({
        name: '🔍 Readiness Checks',
        value: checks.join('\n'),
        inline: false
      });

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while checking recovery status.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
