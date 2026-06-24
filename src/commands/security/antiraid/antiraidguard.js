const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraidguard')
    .setDescription('Enable raid guard mode')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(opt =>
      opt.setName('enabled')
        .setDescription('Enable or disable raid guard')
        .setRequired(true)
    ),
  cooldown: 5,
  aliases: ['arguard'],
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

    await securityEngine.setRaidGuard(interaction.guild.id, {
      enabled,
      toggledBy: user.id,
      toggledAt: Date.now()
    });

    const embed = new EmbedBuilder()
      .setTitle(`Raid Guard ${enabled ? 'Enabled' : 'Disabled'}`)
      .setDescription(enabled
        ? `Raid guard mode has been **enabled** for **${interaction.guild.name}**. The server is now under enhanced protection.`
        : `Raid guard mode has been **disabled** for **${interaction.guild.name}**. Standard protection applies.`
      )
      .setColor(enabled ? 0x00ff00 : 0xff0000)
      .addFields(
        { name: 'Status', value: enabled ? '🟢 **ENABLED**' : '🔴 **DISABLED**', inline: true },
        { name: 'Toggled By', value: `<@${user.id}>`, inline: true }
      );

    if (enabled) {
      embed.addFields(
        { name: 'Protection Level', value: 'Enhanced', inline: true },
        { name: 'Auto-Response', value: 'Active', inline: true },
        { name: 'Monitoring', value: 'Intensive', inline: true }
      );
    }

    embed.setFooter({ text: `Requested by ${user.tag}` }).setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
