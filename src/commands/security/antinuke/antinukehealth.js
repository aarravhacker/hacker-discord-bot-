const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukehealth')
    .setDescription('Check antinuke system health')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  cooldown: 10,
  aliases: ['anhealth', 'ahealth'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Permission Denied')
        .setDescription('You need Administrator permission to use this command.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      await interaction.deferReply();
      const health = await securityEngine.getHealth(interaction.guild.id);

      const overallHealth = health?.overall || 'unknown';
      const healthColor = overallHealth === 'healthy' ? 0x00ff00 : overallHealth === 'degraded' ? 0xffaa00 : 0xff0000;

      const embed = new EmbedBuilder()
        .setColor(healthColor)
        .setTitle('💓 Antinuke System Health')
        .setDescription(`Health status for **${interaction.guild.name}**`)
        .addFields(
          { name: 'Overall Health', value: overallHealth.charAt(0).toUpperCase() + overallHealth.slice(1), inline: true },
          { name: 'Uptime', value: health?.uptime || 'N/A', inline: true },
          { name: 'Last Check', value: health?.lastCheck || 'Now', inline: true }
        )
        .setTimestamp();

      if (health?.components) {
        for (const [component, status] of Object.entries(health.components)) {
          const icon = status === 'ok' ? '✅' : status === 'warning' ? '⚠️' : '❌';
          embed.addFields({
            name: component.charAt(0).toUpperCase() + component.slice(1),
            value: `${icon} ${status}`,
            inline: true
          });
        }
      }

      if (health?.metrics) {
        embed.addFields(
          { name: 'Events Processed', value: String(health.metrics.eventsProcessed || 0), inline: true },
          { name: 'Avg Response Time', value: health.metrics.avgResponseTime || 'N/A', inline: true },
          { name: 'Error Rate', value: health.metrics.errorRate || '0%', inline: true }
        );
      }

      if (health?.issues?.length) {
        const issues = health.issues.map(i => `❌ ${i}`).join('\n');
        embed.addFields({ name: 'Issues Detected', value: issues });
      } else {
        embed.addFields({ name: 'Issues', value: '✅ No issues detected' });
      }

      embed.addFields({ name: 'Checked By', value: user.tag, inline: false });
      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Health Check Error')
        .setDescription(`Failed to check health: ${error.message}`)
        .setTimestamp();
      if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
      }
      return interaction.reply({ embeds: [embed] });
    }
  }
};
