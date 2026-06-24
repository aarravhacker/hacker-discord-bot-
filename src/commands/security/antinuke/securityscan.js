const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('securityscan')
    .setDescription('Scans all members and shows risk scores')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['secscan', 'scanmembers'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    try {
      const riskScores = [];
      guild.members.cache.forEach((member) => {
        if (member.user.bot) return;
        const risk = securityEngine.calculateRisk(guild.id, member.id);
        riskScores.push({
          member,
          risk
        });
      });

      riskScores.sort((a, b) => b.risk - a.risk);
      const top10 = riskScores.slice(0, 10);

      const embed = new EmbedBuilder()
        .setTitle('🔍 Security Scan Results')
        .setDescription(`Scanned **${riskScores.length}** members for risk indicators.`)
        .setColor(0x5865f2)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      if (top10.length === 0) {
        embed.addFields({ name: 'No Members Found', value: 'No non-bot members found in the guild.', inline: false });
      } else {
        const riskList = top10.map((data, index) => {
          let riskEmoji = '🟢';
          if (data.risk > 75) riskEmoji = '🔴';
          else if (data.risk > 50) riskEmoji = '🟠';
          else if (data.risk > 25) riskEmoji = '🟡';

          return `**${index + 1}.** ${data.member.user.tag} (${data.member.id})\n> Risk Score: ${riskEmoji} **${data.risk}/100**`;
        }).join('\n\n');

        embed.addFields({ name: '⚠️ Top 10 Highest Risk Members', value: riskList, inline: false });
      }

      const summary = {
        critical: riskScores.filter(r => r.risk > 75).length,
        high: riskScores.filter(r => r.risk > 50 && r.risk <= 75).length,
        medium: riskScores.filter(r => r.risk > 25 && r.risk <= 50).length,
        low: riskScores.filter(r => r.risk <= 25).length
      };

      embed.addFields({
        name: '📊 Risk Distribution',
        value: `🔴 Critical (>75): **${summary.critical}**\n🟠 High (50-75): **${summary.high}**\n🟡 Medium (25-50): **${summary.medium}**\n🟢 Low (<25): **${summary.low}**`,
        inline: false
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to perform security scan.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};