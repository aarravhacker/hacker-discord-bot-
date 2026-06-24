const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukemode')
    .setDescription('Set antinuke protection mode')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('strict').setDescription('Maximum protection - immediate response'))
    .addSubcommand(sub => sub.setName('moderate').setDescription('Balanced protection - normal response'))
    .addSubcommand(sub => sub.setName('relaxed').setDescription('Minimal protection - delayed response'))
    .addSubcommand(sub => sub.setName('custom').setDescription('Custom protection settings')),

  cooldown: 5,
  aliases: ['anmode', 'amode'],
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

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'moderate');
    const validSubs = ['strict', 'moderate', 'relaxed', 'custom'];
    if (!validSubs.includes(subcommand)) {
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('⚠️ Invalid Subcommand')
        .setDescription(`Valid subcommands: ${validSubs.join(', ')}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      const modeConfig = {
        strict: { responseTime: 'instant', thresholdMultiplier: 0.5, autoAction: true },
        moderate: { responseTime: 'normal', thresholdMultiplier: 1, autoAction: true },
        relaxed: { responseTime: 'delayed', thresholdMultiplier: 1.5, autoAction: false },
        custom: { responseTime: 'configurable', thresholdMultiplier: 1, autoAction: true }
      };

      await securityEngine.setMode(interaction.guild.id, subcommand, modeConfig[subcommand]);

      const modeDescriptions = {
        strict: '🛡️ Maximum protection mode activated. All threats will be responded to immediately.',
        moderate: '⚖️ Moderate protection mode activated. Balanced threat response.',
        relaxed: '🌙 Relaxed protection mode activated. Minimal interference with delayed responses.',
        custom: '🔧 Custom mode activated. Configure thresholds and responses as needed.'
      };

      const embed = new EmbedBuilder()
        .setColor(subcommand === 'strict' ? 0xff0000 : subcommand === 'moderate' ? 0x0099ff : subcommand === 'relaxed' ? 0x00ff00 : 0xffaa00)
        .setTitle(`🛡️ Antinuke Mode - ${subcommand.charAt(0).toUpperCase() + subcommand.slice(1)}`)
        .setDescription(modeDescriptions[subcommand])
        .addFields(
          { name: 'Response Time', value: modeConfig[subcommand].responseTime, inline: true },
          { name: 'Threshold Multiplier', value: `${modeConfig[subcommand].thresholdMultiplier}x`, inline: true },
          { name: 'Auto Action', value: modeConfig[subcommand].autoAction ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Set By', value: user.tag, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(`Failed to set mode: ${error.message}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};
