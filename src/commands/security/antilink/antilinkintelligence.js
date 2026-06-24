const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilinkintelligence')
    .setDescription('Link threat intelligence')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['alintel'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    const intel = await securityEngine.getLinkIntelligence(interaction.guild.id);
    const knownMaliciousDomains = intel.knownMaliciousDomains || [];
    const phishingCampaigns = intel.phishingCampaigns || [];
    const threatLevel = intel.threatLevel || 'low';
    const recentIntels = intel.recentReports || [];
    const blockedDomains = intel.blockedDomains || [];
    const knownPatterns = intel.knownPatterns || [];

    const threatColors = { low: 0x00ff00, medium: 0xffff00, high: 0xff8800, critical: 0xff0000 };
    const color = threatColors[threatLevel] || 0x00ff00;

    const embed = new EmbedBuilder()
      .setTitle('Link Threat Intelligence')
      .setDescription(`Intelligence overview for **${interaction.guild.name}**`)
      .setColor(color)
      .addFields(
        { name: 'Threat Level', value: `\`${threatLevel.toUpperCase()}\``, inline: true },
        { name: 'Known Malicious Domains', value: `\`${knownMaliciousDomains.length}\``, inline: true },
        { name: 'Phishing Campaigns', value: `\`${phishingCampaigns.length}\``, inline: true },
        { name: 'Blocked Domains', value: `\`${blockedDomains.length}\``, inline: true }
      );

    if (knownMaliciousDomains.length > 0) {
      const domainList = knownMaliciousDomains.slice(0, 5).map(d => `• ${d.domain || 'Unknown'} - ${d.reason || 'Malicious'}`).join('\n');
      embed.addFields({ name: 'Known Malicious Domains', value: domainList });
    }

    if (phishingCampaigns.length > 0) {
      const campaignList = phishingCampaigns.slice(0, 3).map(c => `• **${c.name || 'Campaign'}** - ${c.targetCount || 0} targets`).join('\n');
      embed.addFields({ name: 'Active Phishing Campaigns', value: campaignList });
    }

    if (knownPatterns.length > 0) {
      const patternList = knownPatterns.slice(0, 3).map(p => `• ${p.type || 'Unknown'} - ${p.description || 'No description'}`).join('\n');
      embed.addFields({ name: 'Known Patterns', value: patternList });
    }

    if (recentIntels.length > 0) {
      const intelList = recentIntels.slice(0, 3).map(r => `• ${r.title || 'Report'} - <t:${Math.floor(new Date(r.timestamp).getTime() / 1000)}:R>`).join('\n');
      embed.addFields({ name: 'Recent Reports', value: intelList });
    }

    embed.setFooter({ text: `Requested by ${user.tag}` }).setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
