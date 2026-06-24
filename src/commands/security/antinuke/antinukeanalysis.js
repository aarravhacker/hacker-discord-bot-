const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukeanalysis')
    .setDescription('Analyze past attacks')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days to analyze').setMinValue(1).setMaxValue(90)),

  cooldown: 15,
  aliases: ['ananalysis', 'aanalysis'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Permission Denied')
        .setDescription('You need Administrator permission to use this command.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    const days = isSlash ? (interaction.options.getInteger('days') || 30) : (parseInt(args[0]) || 30);

    try {
      await interaction.deferReply();
      const analysis = await securityEngine.analyzeAttacks(interaction.guild.id, days);

      const totalAttacks = analysis?.totalAttacks || 0;
      const blocked = analysis?.blocked || 0;
      const successful = analysis?.successful || 0;

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('📊 Attack Analysis Report')
        .setDescription(`Analysis of the last **${days}** days for **${interaction.guild.name}**`)
        .addFields(
          { name: 'Total Attacks', value: String(totalAttacks), inline: true },
          { name: 'Blocked', value: String(blocked), inline: true },
          { name: 'Successful', value: String(successful), inline: true },
          { name: 'Block Rate', value: totalAttacks > 0 ? `${Math.round((blocked / totalAttacks) * 100)}%` : 'N/A', inline: true },
          { name: 'Avg Response Time', value: analysis?.avgResponseTime || 'N/A', inline: true },
          { name: 'Peak Attack Day', value: analysis?.peakDay || 'N/A', inline: true }
        )
        .setTimestamp();

      if (analysis?.topAttacks?.length) {
        const topAttacks = analysis.topAttacks.slice(0, 5).map(a =>
          `**${a.type}**: ${a.count} times`
        ).join('\n');
        embed.addFields({ name: 'Most Common Attacks', value: topAttacks });
      }

      if (analysis?.topAttackers?.length) {
        const attackers = analysis.topAttackers.slice(0, 5).map(a =>
          `**${a.tag}**: ${a.count} attacks`
        ).join('\n');
        embed.addFields({ name: 'Top Attackers', value: attackers });
      }

      if (analysis?.timeline?.length) {
        const timeline = analysis.timeline.slice(-7).map(t =>
          `\`${t.date}\`: ${t.count} attacks`
        ).join('\n');
        embed.addFields({ name: 'Recent Activity', value: timeline });
      }

      embed.addFields({ name: 'Analyzed By', value: user.tag, inline: false });
      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Analysis Error')
        .setDescription(`Failed to analyze attacks: ${error.message}`)
        .setTimestamp();
      if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
      }
      return interaction.reply({ embeds: [embed] });
    }
  }
};
