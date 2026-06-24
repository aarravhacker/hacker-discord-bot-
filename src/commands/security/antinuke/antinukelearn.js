const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukelearn')
    .setDescription('Learn from past incidents')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable learning from incidents'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable learning from incidents'))
    .addSubcommand(sub => sub.setName('status').setDescription('View learning status')),

  cooldown: 10,
  aliases: ['anlearn', 'alearn'],
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

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'status');
    const validSubs = ['enable', 'disable', 'status'];
    if (!validSubs.includes(subcommand)) {
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('⚠️ Invalid Subcommand')
        .setDescription(`Valid subcommands: ${validSubs.join(', ')}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      if (subcommand === 'enable') {
        await securityEngine.setLearning(interaction.guild.id, true);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('🧠 Learning Enabled')
          .setDescription('Antinuke will now learn from past incidents to improve detection and response.')
          .addFields(
            { name: 'Status', value: '✅ Enabled', inline: true },
            { name: 'Enabled By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'disable') {
        await securityEngine.setLearning(interaction.guild.id, false);
        const embed = new EmbedBuilder()
          .setColor(0xff9900)
          .setTitle('🧠 Learning Disabled')
          .setDescription('Antinuke will no longer learn from past incidents.')
          .addFields(
            { name: 'Status', value: '❌ Disabled', inline: true },
            { name: 'Disabled By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'status') {
        const learnStatus = await securityEngine.getLearningStatus(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x9900ff)
          .setTitle('🧠 Learning Status')
          .setDescription('Current learning status for this server.')
          .addFields(
            { name: 'Learning Enabled', value: learnStatus?.enabled ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Patterns Learned', value: String(learnStatus?.patternsLearned || 0), inline: true },
            { name: 'Incidents Analyzed', value: String(learnStatus?.incidentsAnalyzed || 0), inline: true },
            { name: 'Accuracy', value: `${learnStatus?.accuracy || 0}%`, inline: true },
            { name: 'Last Learning', value: learnStatus?.lastLearning || 'Never', inline: true },
            { name: 'Model Version', value: learnStatus?.modelVersion || '1.0', inline: true }
          )
          .setTimestamp();

        if (learnStatus?.recentLearnings?.length) {
          const learnings = learnStatus.recentLearnings.slice(0, 5).map(l =>
            `\`${l.date}\` ${l.insight}`
          ).join('\n');
          embed.addFields({ name: 'Recent Learnings', value: learnings });
        }

        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(`Learning operation failed: ${error.message}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};
