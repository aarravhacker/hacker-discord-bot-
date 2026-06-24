const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilinkmonitor')
    .setDescription('Real-time link monitor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: [],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    const monitorData = await securityEngine.getLinkMonitor(interaction.guild.id);
    const linksLast5 = monitorData.linksLast5Min || 0;
    const linksLast1 = monitorData.linksLast1Min || 0;
    const totalLinks = monitorData.totalLinks || 0;
    const maliciousLinks = monitorData.maliciousLinks || [];
    const alerts = monitorData.activeAlerts || [];
    const isThreatDetected = monitorData.threatDetected || false;

    const embed = new EmbedBuilder()
      .setTitle('Link Monitor - Live')
      .setDescription(isThreatDetected ? '⚠️ **LINK THREAT DETECTED** - Malicious links are being monitored.' : 'All clear - No malicious link activity detected.')
      .setColor(isThreatDetected ? 0xff0000 : 0x00ff00)
      .addFields(
        { name: 'Links (Last 1 min)', value: `\`${linksLast1}\``, inline: true },
        { name: 'Links (Last 5 min)', value: `\`${linksLast5}\``, inline: true },
        { name: 'Total Links', value: `\`${totalLinks}\``, inline: true },
        { name: 'Malicious Links', value: `\`${maliciousLinks.length}\``, inline: true },
        { name: 'Active Alerts', value: `\`${alerts.length}\``, inline: true },
        { name: 'Status', value: isThreatDetected ? '🔴 **THREAT**' : '🟢 **CLEAR**', inline: true }
      );

    if (maliciousLinks.length > 0) {
      const maliciousList = maliciousLinks.slice(0, 5).map(l => `• ${l.url || 'Unknown'} - ${l.reason || 'Malicious'}`).join('\n');
      embed.addFields({ name: 'Malicious Links Detected', value: maliciousList });
    }

    if (alerts.length > 0) {
      const alertList = alerts.slice(0, 3).map(a => `• ${a.message}`).join('\n');
      embed.addFields({ name: 'Recent Alerts', value: alertList });
    }

    embed.setFooter({ text: `Monitoring since ${monitorData.monitorStarted ? `<t:${Math.floor(new Date(monitorData.monitorStarted).getTime() / 1000)}:R>` : 'N/A'} | Requested by ${user.tag}` }).setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
