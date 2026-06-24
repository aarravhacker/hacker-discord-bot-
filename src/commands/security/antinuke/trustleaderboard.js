const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trustleaderboard')
    .setDescription('View trust leaderboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('limit').setDescription('Number of entries (1-25)').setMinValue(1).setMaxValue(25)
    ),
  cooldown: 5,
  aliases: ['trustlb', 'trleaderboard'],
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

    const limit = isSlash ? (interaction.options.getInteger('limit') || 10) : parseInt(args[0]) || 10;

    try {
      const trustData = [];
      guild.members.cache.forEach((m) => {
        if (m.user.bot) return;
        const trustLevel = securityEngine.getTrustLevel(guild.id, m.id);
        trustData.push({
          member: m,
          trust: trustLevel
        });
      });

      trustData.sort((a, b) => b.trust.score - a.trust.score);
      const topMembers = trustData.slice(0, limit);

      const medals = ['🥇', '🥈', '🥉'];

      const embed = new EmbedBuilder()
        .setTitle('🏆 Trust Leaderboard')
        .setDescription(`Top **${topMembers.length}** most trusted members in **${guild.name}**.`)
        .setColor(0xffd700)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      if (topMembers.length > 0) {
        const leaderboard = topMembers.map((data, index) => {
          const medal = medals[index] || `**#${index + 1}**`;
          let bar = '';
          const filled = Math.round(data.trust.score / 10);
          for (let i = 0; i < 10; i++) {
            bar += i < filled ? '█' : '░';
          }

          return `${medal} ${data.member.user.tag}\n> Trust: **${data.trust.score}/100** (${bar}) | ${data.trust.label}`;
        }).join('\n\n');

        embed.addFields({ name: 'Leaderboard', value: leaderboard, inline: false });
      } else {
        embed.addFields({ name: 'No Data', value: 'No trust data found for this guild.', inline: false });
      }

      embed.addFields({
        name: '📊 Guild Summary',
        value: `👥 Total Members: **${trustData.length}**\n✅ Trusted (Lvl 4+): **${trustData.filter(d => d.trust.isTrusted).length}**\n⚠️ Flagged: **${trustData.filter(d => d.trust.isFlagged).length}**`,
        inline: false
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to load trust leaderboard.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
