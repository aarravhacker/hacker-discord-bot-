const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukeaudit')
    .setDescription('Audit antinuke configuration and health')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  cooldown: 15,
  aliases: ['anaudit', 'aaudit'],
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
      const audit = await securityEngine.auditConfiguration(interaction.guild.id);

      const issues = audit?.issues || [];
      const warnings = audit?.warnings || [];
      const score = audit?.score || 0;

      const scoreColor = score >= 80 ? 0x00ff00 : score >= 50 ? 0xffaa00 : 0xff0000;

      const embed = new EmbedBuilder()
        .setColor(scoreColor)
        .setTitle('🔍 Antinuke Audit Report')
        .setDescription(`Audit completed for **${interaction.guild.name}**`)
        .addFields(
          { name: 'Security Score', value: `${score}/100`, inline: true },
          { name: 'Mode', value: audit?.mode || 'Not set', inline: true },
          { name: 'Monitoring', value: audit?.monitoring ? 'Active' : 'Inactive', inline: true },
          { name: 'Last Scan', value: audit?.lastScan || 'Never', inline: true },
          { name: 'Uptime', value: audit?.uptime || 'N/A', inline: true },
          { name: 'Total Events', value: String(audit?.totalEvents || 0), inline: true }
        )
        .setTimestamp();

      if (audit?.config) {
        embed.addFields(
          { name: 'Thresholds', value: `Channel: ${audit.config.channelThreshold || 3}, Role: ${audit.config.roleThreshold || 3}, Member: ${audit.config.memberThreshold || 5}`, inline: false },
          { name: 'Whitelisted Users', value: String(audit.config.whitelistedUsers || 0), inline: true },
          { name: 'Whitelisted Roles', value: String(audit.config.whitelistedRoles || 0), inline: true }
        );
      }

      if (issues.length > 0) {
        const issuesList = issues.map(i => `❌ ${i}`).join('\n');
        embed.addFields({ name: 'Issues Found', value: issuesList });
      } else {
        embed.addFields({ name: 'Issues', value: '✅ No issues found!' });
      }

      if (warnings.length > 0) {
        const warningsList = warnings.map(w => `⚠️ ${w}`).join('\n');
        embed.addFields({ name: 'Warnings', value: warningsList });
      }

      embed.addFields({ name: 'Audited By', value: user.tag, inline: false });
      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Audit Error')
        .setDescription(`Failed to run audit: ${error.message}`)
        .setTimestamp();
      if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
      }
      return interaction.reply({ embeds: [embed] });
    }
  }
};
