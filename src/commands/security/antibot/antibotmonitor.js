const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antibotmonitor')
    .setDescription('Real-time bot monitor')
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

    const monitorData = await securityEngine.getBotMonitor(interaction.guild.id);
    const botsLast5 = monitorData.botsLast5Min || 0;
    const botsLast1 = monitorData.botsLast1Min || 0;
    const totalBots = monitorData.totalBots || 0;
    const suspiciousBots = monitorData.suspiciousBots || [];
    const alerts = monitorData.activeAlerts || [];
    const isThreatDetected = monitorData.threatDetected || false;

    const embed = new EmbedBuilder()
      .setTitle('Bot Monitor - Live')
      .setDescription(isThreatDetected ? '⚠️ **BOT THREAT DETECTED** - Suspicious bot activity is being monitored.' : 'All clear - No suspicious bot activity detected.')
      .setColor(isThreatDetected ? 0xff0000 : 0x00ff00)
      .addFields(
        { name: 'Bot Joins (Last 1 min)', value: `\`${botsLast1}\``, inline: true },
        { name: 'Bot Joins (Last 5 min)', value: `\`${botsLast5}\``, inline: true },
        { name: 'Total Bots', value: `\`${totalBots}\``, inline: true },
        { name: 'Suspicious Bots', value: `\`${suspiciousBots.length}\``, inline: true },
        { name: 'Active Alerts', value: `\`${alerts.length}\``, inline: true },
        { name: 'Status', value: isThreatDetected ? '🔴 **THREAT**' : '🟢 **CLEAR**', inline: true }
      );

    if (suspiciousBots.length > 0) {
      const suspectList = suspiciousBots.slice(0, 5).map(s => `<@${s.botId}> - ${s.reason || 'Suspicious'}`).join('\n');
      embed.addFields({ name: 'Suspicious Bots', value: suspectList });
    }

    if (alerts.length > 0) {
      const alertList = alerts.slice(0, 3).map(a => `• ${a.message}`).join('\n');
      embed.addFields({ name: 'Recent Alerts', value: alertList });
    }

    embed.setFooter({ text: `Monitoring since ${monitorData.monitorStarted ? `<t:${Math.floor(new Date(monitorData.monitorStarted).getTime() / 1000)}:R>` : 'N/A'} | Requested by ${user.tag}` }).setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
