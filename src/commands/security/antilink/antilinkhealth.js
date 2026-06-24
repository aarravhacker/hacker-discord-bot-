const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilinkhealth')
    .setDescription('Link protection health check')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['alhealth'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    const health = await securityEngine.getLinkProtectionHealth(interaction.guild.id);
    const overallScore = health.overallScore || 0;
    const components = health.components || {};

    const scoreColor = overallScore >= 80 ? 0x00ff00 : overallScore >= 50 ? 0xffff00 : 0xff0000;
    const scoreEmoji = overallScore >= 80 ? '🟢' : overallScore >= 50 ? '🟡' : '🔴';

    const embed = new EmbedBuilder()
      .setTitle('Link Protection Health Check')
      .setDescription(`Health status for **${interaction.guild.name}**`)
      .setColor(scoreColor)
      .addFields(
        { name: 'Overall Score', value: `${scoreEmoji} \`${overallScore}/100\``, inline: true },
        { name: 'Last Check', value: health.lastCheck ? `<t:${Math.floor(new Date(health.lastCheck).getTime() / 1000)}:R>` : 'Never', inline: true }
      );

    if (components.linkFilter) {
      const status = components.linkFilter.enabled ? '✅ Enabled' : '❌ Disabled';
      embed.addFields({ name: 'Link Filter', value: status, inline: true });
    }

    if (components.urlScanner) {
      const status = components.urlScanner.enabled ? '✅ Enabled' : '❌ Disabled';
      embed.addFields({ name: 'URL Scanner', value: status, inline: true });
    }

    if (components.domainBlocklist) {
      const status = components.domainBlocklist.enabled ? '✅ Enabled' : '❌ Disabled';
      embed.addFields({ name: 'Domain Blocklist', value: status, inline: true });
    }

    if (components.alerts) {
      const status = components.alerts.enabled ? '✅ Enabled' : '❌ Disabled';
      embed.addFields({ name: 'Alerts', value: status, inline: true });
    }

    if (health.warnings && health.warnings.length > 0) {
      const warningList = health.warnings.map(w => `⚠️ ${w}`).join('\n');
      embed.addFields({ name: 'Warnings', value: warningList });
    }

    if (health.recommendations && health.recommendations.length > 0) {
      const recList = health.recommendations.map(r => `💡 ${r}`).join('\n');
      embed.addFields({ name: 'Recommendations', value: recList });
    }

    embed.setFooter({ text: `Requested by ${user.tag}` }).setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
