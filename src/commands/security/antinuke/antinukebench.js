const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukebench')
    .setDescription('Benchmark antinuke performance')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt => opt.setName('iterations').setDescription('Number of test iterations').setMinValue(1).setMaxValue(100)),

  cooldown: 30,
  aliases: ['anbench', 'abench'],
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

    const iterations = isSlash ? (interaction.options.getInteger('iterations') || 10) : (parseInt(args[0]) || 10);

    try {
      await interaction.deferReply();
      const bench = await securityEngine.runBenchmark(interaction.guild.id, iterations);

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('⚡ Antinuke Benchmark Results')
        .setDescription(`Benchmark completed with **${iterations}** iterations`)
        .addFields(
          { name: 'Avg Response Time', value: bench?.avgResponseTime || 'N/A', inline: true },
          { name: 'Min Response Time', value: bench?.minResponseTime || 'N/A', inline: true },
          { name: 'Max Response Time', value: bench?.maxResponseTime || 'N/A', inline: true },
          { name: 'Events/Second', value: String(bench?.eventsPerSecond || 0), inline: true },
          { name: 'Memory Usage', value: bench?.memoryUsage || 'N/A', inline: true },
          { name: 'CPU Usage', value: bench?.cpuUsage || 'N/A', inline: true },
          { name: 'Test Duration', value: bench?.duration || 'N/A', inline: true },
          { name: 'Success Rate', value: `${bench?.successRate || 100}%`, inline: true },
          { name: 'Iterations', value: String(iterations), inline: true }
        )
        .setTimestamp();

      if (bench?.recommendations?.length) {
        const recs = bench.recommendations.map(r => `• ${r}`).join('\n');
        embed.addFields({ name: 'Recommendations', value: recs });
      }

      const perfColor = (bench?.successRate || 100) >= 95 ? 0x00ff00 : (bench?.successRate || 100) >= 80 ? 0xffaa00 : 0xff0000;
      embed.setColor(perfColor);

      embed.addFields({ name: 'Run By', value: user.tag, inline: false });
      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Benchmark Error')
        .setDescription(`Benchmark failed: ${error.message}`)
        .setTimestamp();
      if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
      }
      return interaction.reply({ embeds: [embed] });
    }
  }
};
