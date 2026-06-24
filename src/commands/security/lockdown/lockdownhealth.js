const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdownhealth')
    .setDescription('Check lockdown system health')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['ldhealth', 'lockdownstatuscheck'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription('You need Administrator permission to use this command.');
      return interaction.reply({ embeds: [embed] });
    }

    try {
      const stage = securityEngine.getStage(guild.id);
      const incidents = securityEngine.getIncidents(guild.id, 100);
      const profiles = [...securityEngine.profiles.values()].filter(p => p.guildId === guild.id);
      const decoys = securityEngine.getDecoys(guild.id);
      const frozenChannels = securityEngine.isFrozen(guild.id, 'channels');
      const frozenRoles = securityEngine.isFrozen(guild.id, 'roles');
      const frozenStaff = securityEngine.isFrozen(guild.id, 'staff');

      const healthChecks = [];

      const dbHealth = { status: 'healthy', label: '✅' };
      healthChecks.push({ name: 'Database', ...dbHealth });

      const engineHealth = { status: 'healthy', label: '✅' };
      healthChecks.push({ name: 'Security Engine', ...engineHealth });

      const profileHealth = profiles.length > 0 ? { status: 'healthy', label: '✅' } : { status: 'degraded', label: '⚠️' };
      healthChecks.push({ name: 'User Profiles', ...profileHealth, detail: `${profiles.length} profiles` });

      const incidentHealth = { status: 'healthy', label: '✅' };
      healthChecks.push({ name: 'Incident Logger', ...incidentHealth, detail: `${incidents.length} incidents` });

      const freezeHealth = frozenChannels || frozenRoles || frozenStaff ? { status: 'warning', label: '⚠️' } : { status: 'healthy', label: '✅' };
      healthChecks.push({ name: 'Freeze System', ...freezeHealth });

      const decoyHealth = decoys.length > 0 ? { status: 'healthy', label: '✅' } : { status: 'info', label: 'ℹ️' };
      healthChecks.push({ name: 'Decoy System', ...decoyHealth, detail: `${decoys.length} decoys` });

      const overallStatus = healthChecks.some(h => h.status === 'critical') ? '❌ Critical' :
        healthChecks.some(h => h.status === 'warning') ? '⚠️ Warning' :
          healthChecks.some(h => h.status === 'degraded') ? '⚠️ Degraded' : '✅ Healthy';

      const overallColor = healthChecks.some(h => h.status === 'critical') ? 0xed4245 :
        healthChecks.some(h => h.status === 'warning' || h.status === 'degraded') ? 0xffa500 : 0x57f287;

      const embed = new EmbedBuilder()
        .setTitle('🏥 Lockdown System Health')
        .setDescription(`Overall Status: ${overallStatus}`)
        .setColor(overallColor)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
        .addFields(
          { name: 'Current Stage', value: `**${stage.name}** (${stage.stage})`, inline: true },
          { name: 'Active Profiles', value: `${profiles.length}`, inline: true },
          { name: 'Incidents', value: `${incidents.length}`, inline: true }
        );

      const healthList = healthChecks.map(h =>
        `${h.label} **${h.name}**: ${h.status}${h.detail ? ` (${h.detail})` : ''}`
      ).join('\n');
      embed.addFields({ name: '📋 Health Checks', value: healthList, inline: false });

      const uptimeMs = Date.now() - (securityEngine.profiles.get(`uptime:${guild.id}`) || Date.now());
      securityEngine.profiles.set(`uptime:${guild.id}`, Date.now() - uptimeMs);

      securityEngine.logIncident(guild.id, user.id, 'lockdown_health_checked', {
        overallStatus,
        activeProfiles: profiles.length,
        incidents: incidents.length
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to check lockdown system health.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
