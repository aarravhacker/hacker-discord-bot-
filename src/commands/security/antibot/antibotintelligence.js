const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antibotintelligence')
    .setDescription('Bot threat intelligence')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['abintel'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    const intel = await securityEngine.getBotIntelligence(interaction.guild.id);
    const knownMaliciousBots = intel.knownMaliciousBots || [];
    const botNetworks = intel.botNetworks || [];
    const threatLevel = intel.threatLevel || 'low';
    const recentIntels = intel.recentReports || [];
    const blockedBotIds = intel.blockedBotIds || [];
    const knownPatterns = intel.knownPatterns || [];

    const threatColors = { low: 0x00ff00, medium: 0xffff00, high: 0xff8800, critical: 0xff0000 };
    const color = threatColors[threatLevel] || 0x00ff00;

    const embed = new EmbedBuilder()
      .setTitle('Bot Threat Intelligence')
      .setDescription(`Intelligence overview for **${interaction.guild.name}**`)
      .setColor(color)
      .addFields(
        { name: 'Threat Level', value: `\`${threatLevel.toUpperCase()}\``, inline: true },
        { name: 'Known Malicious Bots', value: `\`${knownMaliciousBots.length}\``, inline: true },
        { name: 'Bot Networks', value: `\`${botNetworks.length}\``, inline: true },
        { name: 'Blocked Bot IDs', value: `\`${blockedBotIds.length}\``, inline: true }
      );

    if (knownMaliciousBots.length > 0) {
      const botList = knownMaliciousBots.slice(0, 5).map(b => `• ${b.botId || 'Unknown'} - ${b.reason || 'Malicious'}`).join('\n');
      embed.addFields({ name: 'Known Malicious Bots', value: botList });
    }

    if (botNetworks.length > 0) {
      const networkList = botNetworks.slice(0, 3).map(n => `• **${n.name || 'Network'}** - ${n.botCount || 0} bots`).join('\n');
      embed.addFields({ name: 'Active Bot Networks', value: networkList });
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
