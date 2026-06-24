const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraidsimulate')
    .setDescription('Simulate raid for testing')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('joins')
        .setDescription('Number of joins to simulate (default: 5)')
        .setMinValue(1)
        .setMaxValue(50)
    )
    .addIntegerOption(opt =>
      opt.setName('duration')
        .setDescription('Duration in seconds (default: 10)')
        .setMinValue(1)
        .setMaxValue(60)
    ),
  cooldown: 10,
  aliases: ['arsimulate'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    const joinCount = isSlash
      ? (interaction.options.getInteger('joins') || 5)
      : (parseInt(args[0]) || 5);

    const duration = isSlash
      ? (interaction.options.getInteger('duration') || 10)
      : (parseInt(args[1]) || 10);

    await interaction.deferReply();

    const simResult = await securityEngine.simulateRaid(interaction.guild.id, {
      joinCount,
      duration,
      simulatedBy: user.id
    });

    const embed = new EmbedBuilder()
      .setTitle('Raid Simulation Complete')
      .setDescription(`Simulation finished for **${interaction.guild.name}**`)
      .setColor(0x9900ff)
      .addFields(
        { name: 'Joins Simulated', value: `\`${simResult.joinsSimulated || joinCount}\``, inline: true },
        { name: 'Duration', value: `\`${duration}s\``, inline: true },
        { name: 'Raids Detected', value: `\`${simResult.raidsDetected || 0}\``, inline: true },
        { name: 'Actions Taken', value: `\`${simResult.actionsTaken || 0}\``, inline: true },
        { name: 'Response Time', value: `\`${simResult.responseTime || 0}ms\``, inline: true },
        { name: 'Status', value: simResult.success ? '✅ Simulation completed successfully' : '❌ Simulation had errors', inline: false }
      );

    if (simResult.details && simResult.details.length > 0) {
      const detailList = simResult.details.slice(0, 5).map(d => `• ${d}`).join('\n');
      embed.addFields({ name: 'Details', value: detailList });
    }

    embed.setFooter({ text: `Simulated by ${user.tag}` }).setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
