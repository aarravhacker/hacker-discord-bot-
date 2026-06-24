const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraidintelligence')
    .setDescription('Raid intelligence feed')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['arintel'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    const intel = await securityEngine.getRaidIntelligence(interaction.guild.id);
    const knownRaiders = intel.knownRaiders || [];
    const raidGroups = intel.raidGroups || [];
    const threatLevel = intel.threatLevel || 'low';
    const recentIntels = intel.recentReports || [];
    const ipBlacklist = intel.ipBlacklist || [];
    const patterns = intel.knownPatterns || [];

    const threatColors = { low: 0x00ff00, medium: 0xffff00, high: 0xff8800, critical: 0xff0000 };
    const color = threatColors[threatLevel] || 0x00ff00;

    const embed = new EmbedBuilder()
      .setTitle('Raid Intelligence Feed')
      .setDescription(`Intelligence overview for **${interaction.guild.name}**`)
      .setColor(color)
      .addFields(
        { name: 'Threat Level', value: `\`${threatLevel.toUpperCase()}\``, inline: true },
        { name: 'Known Raiders', value: `\`${knownRaiders.length}\``, inline: true },
        { name: 'Raid Groups', value: `\`${raidGroups.length}\``, inline: true },
        { name: 'IPs Blacklisted', value: `\`${ipBlacklist.length}\``, inline: true }
      );

    if (knownRaiders.length > 0) {
      const raiderList = knownRaiders.slice(0, 5).map(r => `• ${r.userId || 'Unknown'} - ${r.lastSeen || 'N/A'}`).join('\n');
      embed.addFields({ name: 'Known Raiders', value: raiderList });
    }

    if (raidGroups.length > 0) {
      const groupList = raidGroups.slice(0, 3).map(g => `• **${g.name || 'Group'}** - ${g.memberCount || 0} members`).join('\n');
      embed.addFields({ name: 'Active Raid Groups', value: groupList });
    }

    if (patterns.length > 0) {
      const patternList = patterns.slice(0, 3).map(p => `• ${p.type || 'Unknown'} - ${p.description || 'No description'}`).join('\n');
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
