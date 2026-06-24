const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukebaseline')
    .setDescription('Set or clear activity baseline')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('set').setDescription('Set activity baseline'))
    .addSubcommand(sub => sub.setName('clear').setDescription('Clear activity baseline'))
    .addSubcommand(sub => sub.setName('view').setDescription('View current baseline')),

  cooldown: 15,
  aliases: ['anbaseline', 'abaseline'],
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

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'view');
    const validSubs = ['set', 'clear', 'view'];
    if (!validSubs.includes(subcommand)) {
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('⚠️ Invalid Subcommand')
        .setDescription(`Valid subcommands: ${validSubs.join(', ')}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      if (subcommand === 'set') {
        await interaction.deferReply();
        const result = await securityEngine.setBaseline(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('📏 Baseline Set')
          .setDescription('Activity baseline has been captured. This will be used to detect anomalies.')
          .addFields(
            { name: 'Channels', value: String(result?.channels || 0), inline: true },
            { name: 'Roles', value: String(result?.roles || 0), inline: true },
            { name: 'Members', value: String(result?.members || 0), inline: true },
            { name: 'Permissions', value: String(result?.permissions || 0), inline: true },
            { name: 'Set By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      }

      if (subcommand === 'clear') {
        await securityEngine.clearBaseline(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0xff9900)
          .setTitle('📏 Baseline Cleared')
          .setDescription('Activity baseline has been cleared. Set a new baseline to detect anomalies.')
          .addFields({ name: 'Cleared By', value: user.tag, inline: true })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'view') {
        const baseline = await securityEngine.getBaseline(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('📏 Current Baseline')
          .setDescription('Current activity baseline for this server.')
          .setTimestamp();

        if (baseline) {
          embed.addFields(
            { name: 'Channels', value: String(baseline.channels || 0), inline: true },
            { name: 'Roles', value: String(baseline.roles || 0), inline: true },
            { name: 'Members', value: String(baseline.members || 0), inline: true },
            { name: 'Permissions', value: String(baseline.permissions || 0), inline: true },
            { name: 'Set At', value: baseline.setAt || 'N/A', inline: true },
            { name: 'Set By', value: baseline.setBy || 'N/A', inline: true }
          );

          if (baseline.deviations) {
            embed.addFields({ name: '📈 Deviations from Baseline', value: '\u200b', inline: false });
            for (const [key, val] of Object.entries(baseline.deviations)) {
              embed.addFields({ name: key, value: `${val}%`, inline: true });
            }
          }
        } else {
          embed.setDescription('No baseline has been set. Use `/antinukebaseline set` to create one.');
        }

        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(`Baseline operation failed: ${error.message}`)
        .setTimestamp();
      if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
      }
      return interaction.reply({ embeds: [embed] });
    }
  }
};
