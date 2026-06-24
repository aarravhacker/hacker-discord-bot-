const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdownguard')
    .setDescription('Enable or disable lockdown guard')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(opt =>
      opt.setName('enabled').setDescription('Enable or disable lockdown guard').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('threshold').setDescription('Threat threshold to trigger guard (1-100)').setMinValue(1).setMaxValue(100)
    ),
  cooldown: 5,
  aliases: ['ldguard', 'lockdownprotector'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription('You need Administrator permission to use this command.');
      return interaction.reply({ embeds: [embed] });
    }

    let enabled, threshold;

    if (isSlash) {
      enabled = interaction.options.getBoolean('enabled');
      threshold = interaction.options.getInteger('threshold') || 70;
    } else {
      const argsList = interaction.content.split(' ').slice(1);
      enabled = argsList[0]?.toLowerCase() === 'true' || argsList[0] === '1';
      threshold = parseInt(argsList[1]) || 70;
    }

    if (typeof enabled !== 'boolean') {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Usage')
        .setDescription('Usage: `!lockdownguard <true|false> [threshold]`\nExample: `!lockdownguard true 70`')
        .setColor(0xffa500)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      const guardSettings = securityEngine.profiles.get(`guard:${guild.id}`) || {
        enabled: false,
        threshold: 70,
        triggeredCount: 0,
        lastTriggered: null
      };

      guardSettings.enabled = enabled;
      guardSettings.threshold = threshold;
      securityEngine.profiles.set(`guard:${guild.id}`, guardSettings);

      securityEngine.logIncident(guild.id, user.id, 'lockdown_guard_toggled', {
        enabled,
        threshold,
        toggledBy: user.tag
      });

      const embed = new EmbedBuilder()
        .setTitle(`${enabled ? '🛡️ Lockdown Guard Enabled' : '🔓 Lockdown Guard Disabled'}`)
        .setDescription(`Lockdown guard has been **${enabled ? 'enabled' : 'disabled'}**.`)
        .addFields(
          { name: 'Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Trigger Threshold', value: `${threshold}/100 risk`, inline: true },
          { name: 'Times Triggered', value: `${guardSettings.triggeredCount}`, inline: true },
          { name: 'Changed By', value: user.tag, inline: true }
        )
        .setColor(enabled ? 0x57f287 : 0xffa500)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      if (enabled) {
        embed.addFields({
          name: '📋 How It Works',
          value: `When a member's risk score exceeds **${threshold}**, the lockdown guard will automatically:\n• Log the threat\n• Notify administrators\n• Escalate the security stage if needed`,
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to toggle lockdown guard.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
