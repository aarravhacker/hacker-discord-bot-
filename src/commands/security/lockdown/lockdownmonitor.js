const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdownmonitor')
    .setDescription('Real-time lockdown monitor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['ldmonitor', 'lockdownwatch'],
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
      const incidents = securityEngine.getIncidents(guild.id, 20);
      const joinVelocity = securityEngine.analyzeJoinVelocity(guild.id, 300000);
      const frozen = securityEngine.isFrozen(guild.id, 'channels');
      const roleFrozen = securityEngine.isFrozen(guild.id, 'roles');

      const lastIncident = incidents[0];
      const recentActivity = incidents.filter(i => Date.now() - i.timestamp < 3600000);

      const threatIndicators = [];
      if (joinVelocity.isRapid) threatIndicators.push('⚠️ Rapid join velocity detected');
      if (recentActivity.length > 5) threatIndicators.push('⚠️ High incident frequency in last hour');
      if (frozen) threatIndicators.push('🔒 Channel freeze is active');
      if (roleFrozen) threatIndicators.push('🔒 Role freeze is active');
      if (stage.stage >= 4) threatIndicators.push('🚨 Server is in lockdown stage');

      const embed = new EmbedBuilder()
        .setTitle('🔍 Lockdown Monitor')
        .setDescription('Real-time security monitoring dashboard.')
        .setColor(stage.stage >= 4 ? 0xed4245 : stage.stage >= 2 ? 0xffa500 : 0x57f287)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
        .addFields(
          { name: 'Current Stage', value: `**${stage.name}** (${stage.stage})`, inline: true },
          { name: 'Channel Freeze', value: frozen ? '🔒 Active' : '🔓 Inactive', inline: true },
          { name: 'Role Freeze', value: roleFrozen ? '🔒 Active' : '🔓 Inactive', inline: true },
          { name: 'Join Velocity', value: `${joinVelocity.count} in 5m (${joinVelocity.velocity.toFixed(1)}/min)`, inline: true },
          { name: 'Incidents (1h)', value: `${recentActivity.length}`, inline: true },
          { name: 'Total Incidents', value: `${incidents.length}`, inline: true }
        );

      if (threatIndicators.length > 0) {
        embed.addFields({ name: '🚨 Threat Indicators', value: threatIndicators.join('\n'), inline: false });
      } else {
        embed.addFields({ name: '✅ Status', value: 'No active threat indicators detected.', inline: false });
      }

      if (lastIncident) {
        const explanation = securityEngine.explainThreat(lastIncident);
        embed.addFields({
          name: '📋 Last Incident',
          value: `**Type:** ${lastIncident.type}\n**Explanation:** ${explanation}\n**Time:** <t:${Math.floor(lastIncident.timestamp / 1000)}:R>`,
          inline: false
        });
      }

      securityEngine.recordAction(guild.id, user.id, 'message', { channel: 'lockdown-monitor' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to load lockdown monitor.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
