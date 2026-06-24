const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilinkmode')
    .setDescription('Set link filter mode')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('strict')
        .setDescription('Strict mode - Only whitelisted links allowed')
    )
    .addSubcommand(sub =>
      sub.setName('moderate')
        .setDescription('Moderate mode - Block known malicious links')
    )
    .addSubcommand(sub =>
      sub.setName('relaxed')
        .setDescription('Relaxed mode - Log only, no blocking')
    ),
  cooldown: 5,
  aliases: ['almode'],
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
        description: 'Only whitelisted links are allowed. All other links are automatically deleted.',
        color: 0xff0000,
        features: ['Whitelist only', 'Auto-delete others', 'Admin alerts', 'Zero tolerance']
      },
      moderate: {
        name: 'Moderate Mode',
        description: 'Known malicious and phishing links are blocked. Suspicious links are flagged.',
        color: 0xffff00,
        features: ['Block known malicious', 'Flag suspicious', 'URL scanning', 'Domain blacklist']
      },
      relaxed: {
        name: 'Relaxed Mode',
        description: 'All links are allowed but logged for monitoring purposes.',
        color: 0x00ff00,
        features: ['All links allowed', 'Activity logging', 'Pattern detection', 'No blocking']
      }
    };

    const mode = modes[subcommand];
    if (!mode) {
      return interaction.reply({ content: 'Invalid mode. Choose: strict, moderate, or relaxed.', ephemeral: true });
    }

    await securityEngine.setLinkMode(interaction.guild.id, {
      mode: subcommand,
      changedBy: user.id,
      changedAt: Date.now()
    });

    const embed = new EmbedBuilder()
      .setTitle(`Link Filter: ${mode.name}`)
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
