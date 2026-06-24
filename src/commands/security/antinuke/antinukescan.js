const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukescan')
    .setDescription('Scan server for vulnerabilities')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('target')
        .setDescription('What to scan')
        .addChoices(
          { name: 'Full Server', value: 'full' },
          { name: 'Roles Only', value: 'roles' },
          { name: 'Channels Only', value: 'channels' },
          { name: 'Permissions Only', value: 'permissions' },
          { name: 'Members Only', value: 'members' }
        )
    ),

  cooldown: 15,
  aliases: ['anscan', 'ascan'],
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

    const target = isSlash ? (interaction.options.getString('target') || 'full') : (args[0] || 'full');
    const validTargets = ['full', 'roles', 'channels', 'permissions', 'members'];
    if (!validTargets.includes(target)) {
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('⚠️ Invalid Target')
        .setDescription(`Valid targets: ${validTargets.join(', ')}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      await interaction.deferReply();
      const scanResult = await securityEngine.scanServer(interaction.guild.id, target);

      const vulnerabilities = scanResult?.vulnerabilities || [];
      const severityColors = { critical: 0xff0000, high: 0xff6600, medium: 0xffaa00, low: 0xffff00, info: 0x0099ff };
      const worstSeverity = vulnerabilities.length > 0
        ? vulnerabilities.reduce((worst, v) => {
            const order = ['critical', 'high', 'medium', 'low', 'info'];
            return order.indexOf(v.severity) < order.indexOf(worst) ? v.severity : worst;
          }, 'info')
        : 'info';

      const embed = new EmbedBuilder()
        .setColor(severityColors[worstSeverity] || 0x0099ff)
        .setTitle(`🔍 Antinuke Scan - ${target.charAt(0).toUpperCase() + target.slice(1)}`)
        .setDescription(scanResult?.summary || `Scan completed for ${target}.`)
        .addFields(
          { name: 'Server', value: interaction.guild.name, inline: true },
          { name: 'Scan Target', value: target.charAt(0).toUpperCase() + target.slice(1), inline: true },
          { name: 'Vulnerabilities Found', value: String(vulnerabilities.length), inline: true },
          { name: 'Overall Risk', value: worstSeverity.toUpperCase(), inline: true }
        )
        .setTimestamp();

      if (vulnerabilities.length > 0) {
        const vulnList = vulnerabilities.slice(0, 10).map(v =>
          `\`${v.severity.toUpperCase()}\` ${v.description}`
        ).join('\n');
        embed.addFields({ name: 'Top Vulnerabilities', value: vulnList });
      } else {
        embed.addFields({ name: 'Result', value: '✅ No vulnerabilities detected!' });
      }

      if (scanResult?.recommendations?.length) {
        const recs = scanResult.recommendations.slice(0, 5).map(r => `• ${r}`).join('\n');
        embed.addFields({ name: 'Recommendations', value: recs });
      }

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Scan Error')
        .setDescription(`Failed to scan server: ${error.message}`)
        .setTimestamp();
      if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
      }
      return interaction.reply({ embeds: [embed] });
    }
  }
};
