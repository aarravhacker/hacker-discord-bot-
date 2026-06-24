const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antibotguard')
    .setDescription('Bot guard mode')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(opt =>
      opt.setName('enabled')
        .setDescription('Enable or disable bot guard')
        .setRequired(true)
    ),
  cooldown: 5,
  aliases: ['abguard'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    let enabled;
    if (isSlash) {
      enabled = interaction.options.getBoolean('enabled');
    } else {
      const arg = (args[0] || '').toLowerCase();
      enabled = arg === 'true' || arg === 'on' || arg === 'enable' || arg === '1';
    }

    await securityEngine.setBotGuard(interaction.guild.id, {
      enabled,
      toggledBy: user.id,
      toggledAt: Date.now()
    });

    const embed = new EmbedBuilder()
      .setTitle(`Bot Guard ${enabled ? 'Enabled' : 'Disabled'}`)
      .setDescription(enabled
        ? `Bot guard mode has been **enabled** for **${interaction.guild.name}**. Enhanced bot protection is now active.`
        : `Bot guard mode has been **disabled** for **${interaction.guild.name}**. Standard bot monitoring applies.`
      )
      .setColor(enabled ? 0x00ff00 : 0xff0000)
      .addFields(
        { name: 'Status', value: enabled ? '🟢 **ENABLED**' : '🔴 **DISABLED**', inline: true },
        { name: 'Toggled By', value: `<@${user.id}>`, inline: true }
      );

    if (enabled) {
      embed.addFields(
        { name: 'Protection Level', value: 'Enhanced', inline: true },
        { name: 'Auto-Removal', value: 'Active', inline: true },
        { name: 'Verification Required', value: 'Yes', inline: true }
      );
    }

    embed.setFooter({ text: `Requested by ${user.tag}` }).setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
