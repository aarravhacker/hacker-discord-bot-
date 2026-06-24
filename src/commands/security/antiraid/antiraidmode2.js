const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraidmode2')
    .setDescription('Advanced raid mode settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('auto')
        .setDescription('Enable automatic raid detection and response')
    )
    .addSubcommand(sub =>
      sub.setName('manual')
        .setDescription('Enable manual raid response mode')
    )
    .addSubcommand(sub =>
      sub.setName('aggressive')
        .setDescription('Enable aggressive raid mode - immediate action')
    )
    .addSubcommand(sub =>
      sub.setName('passive')
        .setDescription('Enable passive raid mode - monitoring only')
    ),
  cooldown: 5,
  aliases: ['armode'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'auto');

    const modes = {
      auto: {
        name: 'Auto Mode',
        description: 'Automatically detects and responds to raids using the security engine.',
        color: 0x00ff00,
        features: ['Auto-detection', 'Auto-response', 'Dynamic thresholds', 'Smart banning']
      },
      manual: {
        name: 'Manual Mode',
        description: 'Alerts admins but requires manual intervention for actions.',
        color: 0xffff00,
        features: ['Admin alerts', 'Manual approval', 'Detailed reports', 'No auto-actions']
      },
      aggressive: {
        name: 'Aggressive Mode',
        description: 'Immediate and forceful response to any suspected raid activity.',
        color: 0xff0000,
        features: ['Instant bans', 'IP tracking', 'Mass moderation', 'Zero tolerance']
      },
      passive: {
        name: 'Passive Mode',
        description: 'Monitors and logs raid activity without taking action.',
        color: 0x0099ff,
        features: ['Activity logging', 'Pattern analysis', 'No interventions', 'Data collection']
      }
    };

    const mode = modes[subcommand];
    if (!mode) {
      return interaction.reply({ content: 'Invalid mode. Choose: auto, manual, aggressive, or passive.', ephemeral: true });
    }

    await securityEngine.setRaidMode(interaction.guild.id, {
      mode: subcommand,
      changedBy: user.id,
      changedAt: Date.now()
    });

    const embed = new EmbedBuilder()
      .setTitle(`Raid Mode: ${mode.name}`)
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
