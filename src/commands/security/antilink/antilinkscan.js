const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilinkscan')
    .setDescription('Scan for malicious links')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: [],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    const scanData = await securityEngine.scanForLinks(interaction.guild.id);
    const maliciousCount = scanData.maliciousLinks || 0;
    const suspiciousCount = scanData.suspiciousLinks || 0;
    const blockedCount = scanData.blockedLinks || 0;
    const flaggedDomains = scanData.flaggedDomains || [];

    const threatLevel = scanData.threatLevel || 'low';
    const threatColors = { low: 0x00ff00, medium: 0xffff00, high: 0xff8800, critical: 0xff0000 };
    const color = threatColors[threatLevel] || 0x00ff00;

    const embed = new EmbedBuilder()
      .setTitle('Link Scan Results')
      .setDescription(`Completed link scan for **${interaction.guild.name}**`)
      .setColor(color)
      .addFields(
        { name: 'Threat Level', value: `\`${threatLevel.toUpperCase()}\``, inline: true },
        { name: 'Malicious Links', value: `\`${maliciousCount}\``, inline: true },
        { name: 'Suspicious Links', value: `\`${suspiciousCount}\``, inline: true },
        { name: 'Blocked Links', value: `\`${blockedCount}\``, inline: true },
        { name: 'Flagged Domains', value: `\`${flaggedDomains.length}\``, inline: true },
        { name: 'Scan Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      );

    if (flaggedDomains.length > 0) {
      const domainList = flaggedDomains.slice(0, 5).map(d => `• ${d.domain || d} - ${d.count || 0} occurrences`).join('\n');
      embed.addFields({ name: 'Flagged Domains', value: domainList });
    }

    if (maliciousCount === 0 && suspiciousCount === 0) {
      embed.addFields({ name: 'Result', value: 'No malicious or suspicious links detected. Server is clean.' });
    } else {
      embed.addFields({ name: 'Result', value: `Found ${maliciousCount} malicious and ${suspiciousCount} suspicious links. Review recommended.` });
    }

    embed.setFooter({ text: `Requested by ${user.tag}` }).setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
