const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trustscan')
    .setDescription('Scan all members trust levels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['trscan', 'scantrust'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription('You need Administrator permission to use this command.');
      return interaction.reply({ embeds: [embed] });
    }

    try {
      const trustData = [];
      guild.members.cache.forEach((m) => {
        if (m.user.bot) return;
        const trustLevel = securityEngine.getTrustLevel(guild.id, m.id);
        const risk = securityEngine.calculateRisk(guild.id, m.id);
        trustData.push({
          member: m,
          trust: trustLevel,
          risk
        });
      });

      trustData.sort((a, b) => b.trust.score - a.trust.score);

      const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let flaggedCount = 0;
      let trustedCount = 0;

      for (const data of trustData) {
        levelCounts[data.trust.level] = (levelCounts[data.trust.level] || 0) + 1;
        if (data.trust.isFlagged) flaggedCount++;
        if (data.trust.isTrusted) trustedCount++;
      }

      const top10 = trustData.slice(0, 10);

      const embed = new EmbedBuilder()
        .setTitle('🔍 Trust Scan Results')
        .setDescription(`Scanned **${trustData.length}** members for trust levels.`)
        .setColor(0x5865f2)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      if (top10.length > 0) {
        const trustList = top10.map((data, index) => {
          let trustEmoji = '🟢';
          if (data.trust.level >= 4) trustEmoji = '🟣';
          else if (data.trust.level >= 3) trustEmoji = '🔵';
          else if (data.trust.level >= 2) trustEmoji = '🟡';

          return `**${index + 1}.** ${data.member.user.tag}\n> Trust: ${trustEmoji} **${data.trust.score}/100** (Lvl ${data.trust.level} - ${data.trust.label}) | Risk: **${data.risk}/100**`;
        }).join('\n\n');
        embed.addFields({ name: '🏆 Top 10 Highest Trust', value: trustList, inline: false });
      }

      embed.addFields({
        name: '📊 Trust Distribution',
        value: `🟣 Veteran (5): **${levelCounts[5] || 0}**\n🔵 Trusted (4): **${levelCounts[4] || 0}**\n🟢 Established (3): **${levelCounts[3] || 0}**\n🟡 Known (2): **${levelCounts[2] || 0}**\n⚪ Newcomer (1): **${levelCounts[1] || 0}**`,
        inline: false
      });

      embed.addFields({
        name: '📋 Summary',
        value: `✅ Trusted: **${trustedCount}**\n⚠️ Flagged: **${flaggedCount}**\n👥 Total Scanned: **${trustData.length}**`,
        inline: false
      });

      securityEngine.logIncident(guild.id, user.id, 'trust_scan_executed', {
        totalScanned: trustData.length,
        trustedCount,
        flaggedCount
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to perform trust scan.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
