const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukemonitor')
    .setDescription('Watch, pause, or resume antinuke monitoring')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('watch').setDescription('Start monitoring the server'))
    .addSubcommand(sub => sub.setName('pause').setDescription('Pause monitoring temporarily'))
    .addSubcommand(sub => sub.setName('resume').setDescription('Resume paused monitoring')),

  cooldown: 5,
  aliases: ['anmonitor', 'amonitor'],
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

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'watch');
    const validSubs = ['watch', 'pause', 'resume'];
    if (!validSubs.includes(subcommand)) {
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('⚠️ Invalid Subcommand')
        .setDescription(`Valid subcommands: ${validSubs.join(', ')}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      let result;
      if (subcommand === 'watch') {
        result = await securityEngine.startMonitoring(interaction.guild.id);
      } else if (subcommand === 'pause') {
        result = await securityEngine.pauseMonitoring(interaction.guild.id);
      } else {
        result = await securityEngine.resumeMonitoring(interaction.guild.id);
      }

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(`🔍 Antinuke Monitor - ${subcommand.charAt(0).toUpperCase() + subcommand.slice(1)}`)
        .setDescription(result?.message || `Monitoring ${subcommand} successfully.`)
        .addFields(
          { name: 'Server', value: interaction.guild.name, inline: true },
          { name: 'Status', value: subcommand === 'watch' ? 'Active' : subcommand === 'pause' ? 'Paused' : 'Resumed', inline: true },
          { name: 'Operator', value: user.tag, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(`Failed to ${subcommand} monitoring: ${error.message}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};
