const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antibotmode')
    .setDescription('Set bot detection mode')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('strict')
        .setDescription('Strict mode - Only verified bots allowed')
    )
    .addSubcommand(sub =>
      sub.setName('moderate')
        .setDescription('Moderate mode - Verified and trusted unverified bots')
    )
    .addSubcommand(sub =>
      sub.setName('relaxed')
        .setDescription('Relaxed mode - All bots allowed, monitor only')
    ),
  cooldown: 5,
  aliases: ['abmode'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'moderate');

    const modes = {
      strict: {
        name: 'Strict Mode',
        description: 'Only verified bots are allowed. All unverified bots are automatically removed.',
        color: 0xff0000,
        features: ['Auto-remove unverified bots', 'Verification required', 'Zero tolerance', 'Admin alerts only for verified bots']
      },
      moderate: {
        name: 'Moderate Mode',
        description: 'Verified and trusted unverified bots are allowed. Suspicious bots are flagged.',
        color: 0xffff00,
        features: ['Allow verified bots', 'Trust system for unverified', 'Suspicious flagging', 'Rate limiting']
      },
      relaxed: {
        name: 'Relaxed Mode',
        description: 'All bots are allowed but monitored for suspicious activity.',
        color: 0x00ff00,
        features: ['All bots allowed', 'Activity monitoring', 'Pattern detection', 'Logging only']
      }
    };

    const mode = modes[subcommand];
    if (!mode) {
      return interaction.reply({ content: 'Invalid mode. Choose: strict, moderate, or relaxed.', ephemeral: true });
    }

    await securityEngine.setBotMode(interaction.guild.id, {
      mode: subcommand,
      changedBy: user.id,
      changedAt: Date.now()
    });

    const embed = new EmbedBuilder()
      .setTitle(`Bot Detection: ${mode.name}`)
      .setDescription(mode.description)
      .setColor(mode.color)
      .addFields(
        { name: 'Mode', value: `\`${subcommand.toUpperCase()}\``, inline: true },
        { name: 'Changed By', value: `<@${user.id}>`, inline: true },
        { name: 'Features', value: mode.features.map(f => `• ${f}`).join('\n') }
      )
      .setFooter({ text: `Requested by ${user.tag}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
