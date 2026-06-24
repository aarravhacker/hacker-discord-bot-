const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraidscan')
    .setDescription('Scan for raid patterns')
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

    const scanData = await securityEngine.scanForRaids(interaction.guild.id);
    const raidPatterns = scanData.patterns || [];
    const suspiciousAccounts = scanData.suspicious || [];
    const recentJoins = scanData.recentJoins || [];

    const riskLevel = scanData.riskLevel || 'low';
    const riskColors = { low: 0x00ff00, medium: 0xffff00, high: 0xff8800, critical: 0xff0000 };
    const riskColor = riskColors[riskLevel] || 0x00ff00;

    const embed = new EmbedBuilder()
      .setTitle('Raid Scan Results')
      .setDescription(`Completed raid pattern scan for **${interaction.guild.name}**`)
      .setColor(riskColor)
      .addFields(
        { name: 'Risk Level', value: `\`${riskLevel.toUpperCase()}\``, inline: true },
        { name: 'Patterns Detected', value: `\`${raidPatterns.length}\``, inline: true },
        { name: 'Suspicious Accounts', value: `\`${suspiciousAccounts.length}\``, inline: true },
        { name: 'Recent Joins (10 min)', value: `\`${recentJoins.length}\``, inline: true },
        { name: 'Scan Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      );

    if (raidPatterns.length > 0) {
      const patternList = raidPatterns.slice(0, 5).map((p, i) => `**${i + 1}.** ${p.type} - ${p.description || 'No description'}`).join('\n');
      embed.addFields({ name: 'Detected Patterns', value: patternList });
    }

    if (suspiciousAccounts.length > 0) {
      const suspectList = suspiciousAccounts.slice(0, 5).map(s => `<@${s.userId}> (${s.reason || 'Suspicious activity'})`).join('\n');
      embed.addFields({ name: 'Top Suspicious Accounts', value: suspectList });
    }

    embed.setFooter({ text: `Requested by ${user.tag}` }).setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
