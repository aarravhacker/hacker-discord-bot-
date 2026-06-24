const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('insiderscan')
    .setDescription('Scan all staff for insider threats')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['insiderscan', 'is'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    try {
      if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription('You need Administrator permission to use this command.');
        return interaction.reply({ embeds: [embed] });
      }

      const loadingEmbed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setDescription('🔍 Scanning all staff members for insider threats...')
        .setTimestamp();
      await interaction.reply({ embeds: [loadingEmbed] });

      const staffMembers = guild.members.cache.filter(m => {
        if (m.user.bot) return false;
        return m.permissions.has(PermissionFlagsBits.Administrator) ||
          m.permissions.has(PermissionFlagsBits.ManageGuild) ||
          m.permissions.has(PermissionFlagsBits.ManageRoles) ||
          m.permissions.has(PermissionFlagsBits.ManageChannels) ||
          m.permissions.has(PermissionFlagsBits.BanMembers) ||
          m.permissions.has(PermissionFlagsBits.KickMembers);
      });

      const results = [];
      staffMembers.forEach((staff) => {
        const analysis = securityEngine.detectInsiderThreat(guild.id, staff.id);
        const risk = securityEngine.calculateRisk(guild.id, staff.id);
        const trust = securityEngine.getTrustLevel(guild.id, staff.id);
        results.push({ member: staff, analysis, risk, trust });
      });

      results.sort((a, b) => b.risk - a.risk);

      let color = 0x00ff00;
      const criticalCount = results.filter(r => r.analysis.threatLevel === 'critical').length;
      const highCount = results.filter(r => r.analysis.threatLevel === 'high').length;
      if (criticalCount > 0) color = 0xff0000;
      else if (highCount > 0) color = 0xff6600;
      else if (results.some(r => r.analysis.threatLevel === 'medium')) color = 0xffff00;

      const embed = new EmbedBuilder()
        .setTitle('🔍 Insider Threat Scan Complete')
        .setDescription(`Scanned **${staffMembers.size}** staff members across the server.`)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      const threatList = results.slice(0, 15).map((data, index) => {
        let threatEmoji = '🟢';
        if (data.analysis.threatLevel === 'critical') threatEmoji = '🔴';
        else if (data.analysis.threatLevel === 'high') threatEmoji = '🟠';
        else if (data.analysis.threatLevel === 'medium') threatEmoji = '🟡';

        return `**${index + 1}.** ${data.member.user.tag}\n> ${threatEmoji} Threat: **${data.analysis.threatLevel.toUpperCase()}** | Risk: **${data.risk}**/100 | Trust: **${data.trust.score}**`;
      }).join('\n');

      if (threatList) {
        embed.addFields({ name: 'Staff Analysis', value: threatList.substring(0, 1024), inline: false });
      }

      embed.addFields({
        name: '📊 Summary',
        value: `🔴 Critical: **${criticalCount}**\n🟠 High: **${highCount}**\n🟡 Medium: **${results.filter(r => r.analysis.threatLevel === 'medium').length}**\n🟢 Low: **${results.filter(r => r.analysis.threatLevel === 'low').length}**`,
        inline: true
      });

      embed.addFields({
        name: '👥 Total Scanned',
        value: `**${staffMembers.size}** staff members`,
        inline: true
      });

      if (criticalCount > 0 || highCount > 0) {
        embed.addFields({
          name: '⚠️ Action Required',
          value: 'Critical or high threats detected. Review flagged staff immediately.',
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while scanning for insider threats.')
        .setColor(0xff0000)
        .setTimestamp();
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
