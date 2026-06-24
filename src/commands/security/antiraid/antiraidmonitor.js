const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraidmonitor')
    .setDescription('Real-time raid monitor')
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

    const monitorData = await securityEngine.getRaidMonitor(interaction.guild.id);
    const joinsLast5 = monitorData.joinsLast5Min || 0;
    const joinsLast1 = monitorData.joinsLast1Min || 0;
    const currentOnline = monitorData.currentOnline || 0;
    const flaggedAccounts = monitorData.flaggedAccounts || [];
    const alerts = monitorData.activeAlerts || [];
    const isRaidDetected = monitorData.raidDetected || false;

    const embed = new EmbedBuilder()
      .setTitle('Raid Monitor - Live')
      .setDescription(isRaidDetected ? '⚠️ **RAID DETECTED** - Active threats are being monitored.' : 'All clear - No raid activity detected.')
      .setColor(isRaidDetected ? 0xff0000 : 0x00ff00)
      .addFields(
        { name: 'Joins (Last 1 min)', value: `\`${joinsLast1}\``, inline: true },
        { name: 'Joins (Last 5 min)', value: `\`${joinsLast5}\``, inline: true },
        { name: 'Currently Online', value: `\`${currentOnline}\``, inline: true },
        { name: 'Flagged Accounts', value: `\`${flaggedAccounts.length}\``, inline: true },
        { name: 'Active Alerts', value: `\`${alerts.length}\``, inline: true },
        { name: 'Status', value: isRaidDetected ? '🔴 **ACTIVE**' : '🟢 **CLEAR**', inline: true }
      );

    if (flaggedAccounts.length > 0) {
      const flaggedList = flaggedAccounts.slice(0, 5).map(f => `<@${f.userId}> - ${f.reason || 'Suspicious'}`).join('\n');
      embed.addFields({ name: 'Flagged Accounts', value: flaggedList });
    }

    if (alerts.length > 0) {
      const alertList = alerts.slice(0, 3).map(a => `• ${a.message}`).join('\n');
      embed.addFields({ name: 'Recent Alerts', value: alertList });
    }

    embed.setFooter({ text: `Monitoring since ${monitorData.monitorStarted ? `<t:${Math.floor(new Date(monitorData.monitorStarted).getTime() / 1000)}:R>` : 'N/A'} | Requested by ${user.tag}` }).setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
