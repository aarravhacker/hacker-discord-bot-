const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukesentinel')
    .setDescription('Enable sentinel mode - always watching')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('action')
        .setDescription('Action to perform')
        .setRequired(false)
        .addChoices(
          { name: 'Enable', value: 'enable' },
          { name: 'Disable', value: 'disable' },
          { name: 'Status', value: 'status' }
        )
    ),

  cooldown: 10,
  aliases: ['ansentinel', 'asentinel'],
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

    const action = isSlash ? (interaction.options.getString('action') || 'status') : (args[0] || 'status');

    try {
      if (action === 'enable') {
        await securityEngine.setSentinelMode(interaction.guild.id, true);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('👁️ Sentinel Mode Enabled')
          .setDescription('Sentinel mode is now **ACTIVE**. The bot will always watch for threats and respond immediately.')
          .addFields(
            { name: 'Mode', value: '👁️ Sentinel', inline: true },
            { name: 'Status', value: '🟢 Always Watching', inline: true },
            { name: 'Enabled By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (action === 'disable') {
        await securityEngine.setSentinelMode(interaction.guild.id, false);
        const embed = new EmbedBuilder()
          .setColor(0xff9900)
          .setTitle('👁️ Sentinel Mode Disabled')
          .setDescription('Sentinel mode is now **INACTIVE**. The bot will only respond to events as they occur.')
          .addFields(
            { name: 'Mode', value: 'Standard', inline: true },
            { name: 'Status', value: '🟡 Event-Driven', inline: true },
            { name: 'Disabled By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (action === 'status') {
        const sentinelStatus = await securityEngine.getSentinelStatus(interaction.guild.id);
        const isActive = sentinelStatus?.active;
        const embed = new EmbedBuilder()
          .setColor(isActive ? 0x00ff00 : 0xff9900)
          .setTitle('👁️ Sentinel Mode Status')
          .setDescription(`Sentinel mode status for **${interaction.guild.name}**`)
          .addFields(
            { name: 'Status', value: isActive ? '🟢 Active (Always Watching)' : '🟡 Inactive (Event-Driven)', inline: true },
            { name: 'Uptime', value: sentinelStatus?.uptime || 'N/A', inline: true },
            { name: 'Events Monitored', value: String(sentinelStatus?.eventsMonitored || 0), inline: true },
            { name: 'Threats Detected', value: String(sentinelStatus?.threatsDetected || 0), inline: true },
            { name: 'Last Scan', value: sentinelStatus?.lastScan || 'N/A', inline: true },
            { name: 'Scan Interval', value: sentinelStatus?.scanInterval || '30s', inline: true }
          )
          .setTimestamp();

        if (sentinelStatus?.watching) {
          embed.addFields({ name: '👁️ Currently Watching', value: sentinelStatus.watching.join(', ') || 'Nothing' });
        }

        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(`Sentinel operation failed: ${error.message}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};
