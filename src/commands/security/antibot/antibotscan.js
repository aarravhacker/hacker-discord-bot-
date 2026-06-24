const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antibotscan')
    .setDescription('Scan for suspicious bots')
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

    const scanData = await securityEngine.scanForBots(interaction.guild.id);
    const suspiciousBots = scanData.suspiciousBots || [];
    const verifiedBots = scanData.verifiedBots || [];
    const unverifiedBots = scanData.unverifiedBots || [];
    const flaggedPermissions = scanData.flaggedPermissions || [];

    const threatLevel = scanData.threatLevel || 'low';
    const threatColors = { low: 0x00ff00, medium: 0xffff00, high: 0xff8800, critical: 0xff0000 };
    const color = threatColors[threatLevel] || 0x00ff00;

    const embed = new EmbedBuilder()
      .setTitle('Bot Scan Results')
      .setDescription(`Completed bot scan for **${interaction.guild.name}**`)
      .setColor(color)
      .addFields(
        { name: 'Threat Level', value: `\`${threatLevel.toUpperCase()}\``, inline: true },
        { name: 'Suspicious Bots', value: `\`${suspiciousBots.length}\``, inline: true },
        { name: 'Verified Bots', value: `\`${verifiedBots.length}\``, inline: true },
        { name: 'Unverified Bots', value: `\`${unverifiedBots.length}\``, inline: true },
        { name: 'Flagged Permissions', value: `\`${flaggedPermissions.length}\``, inline: true },
        { name: 'Scan Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      );

    if (suspiciousBots.length > 0) {
      const botList = suspiciousBots.slice(0, 5).map(b => `• <@${b.botId}> - ${b.reason || 'Suspicious behavior'}`).join('\n');
      embed.addFields({ name: 'Top Suspicious Bots', value: botList });
    }

    if (flaggedPermissions.length > 0) {
      const permList = flaggedPermissions.slice(0, 5).map(p => `• <@${p.botId}> - ${p.permission || 'Unknown'}`).join('\n');
      embed.addFields({ name: 'Flagged Permissions', value: permList });
    }

    embed.setFooter({ text: `Requested by ${user.tag}` }).setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
