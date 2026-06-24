const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

const DEFAULT_SETTINGS = {
  policy: 'moderate',
  alertThreshold: 20,
  alertEnabled: false,
  alertChannel: null,
  decayEnabled: false,
  decayRate: 2,
  decayGracePeriod: 7,
  autoGrantOnJoin: false,
  autoGrantAmount: 5,
  suspiciousThreshold: -10,
  flagOnSuspicious: true,
  trustGainMultiplier: 1.0
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trustsettings')
    .setDescription('Manage trust system settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('view').setDescription('View current trust settings')
    )
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set a trust setting')
        .addStringOption(opt =>
          opt.setName('key').setDescription('Setting key').setRequired(true)
            .addChoices(
              { name: 'policy', value: 'policy' },
              { name: 'alertThreshold', value: 'alertThreshold' },
              { name: 'alertEnabled', value: 'alertEnabled' },
              { name: 'decayEnabled', value: 'decayEnabled' },
              { name: 'decayRate', value: 'decayRate' },
              { name: 'decayGracePeriod', value: 'decayGracePeriod' },
              { name: 'autoGrantOnJoin', value: 'autoGrantOnJoin' },
              { name: 'autoGrantAmount', value: 'autoGrantAmount' },
              { name: 'suspiciousThreshold', value: 'suspiciousThreshold' },
              { name: 'flagOnSuspicious', value: 'flagOnSuspicious' },
              { name: 'trustGainMultiplier', value: 'trustGainMultiplier' }
            )
        )
        .addStringOption(opt =>
          opt.setName('value').setDescription('Value to set').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('reset').setDescription('Reset all trust settings to defaults')
    ),
  cooldown: 5,
  aliases: ['trsettings', 'trustconfig'],
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

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || '').toLowerCase();

    try {
      const settings = securityEngine.profiles.get(`trustSettings:${guild.id}`) || { ...DEFAULT_SETTINGS };
      securityEngine.profiles.set(`trustSettings:${guild.id}`, settings);

      if (subcommand === 'view') {
        const embed = new EmbedBuilder()
          .setTitle('⚙️ Trust System Settings')
          .setDescription('Current trust system configuration.')
          .setColor(0x5865f2)
          .setTimestamp()
          .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
          .addFields(
            { name: '📋 Policy', value: settings.policy, inline: true },
            { name: '🔔 Alert Threshold', value: `${settings.alertThreshold}/100`, inline: true },
            { name: '🔔 Alerts Enabled', value: settings.alertEnabled ? '✅' : '❌', inline: true },
            { name: '🔔 Alert Channel', value: settings.alertChannel ? `<#${settings.alertChannel}>` : 'Not set', inline: true },
            { name: '⏳ Decay Enabled', value: settings.decayEnabled ? '✅' : '❌', inline: true },
            { name: '⏳ Decay Rate', value: `${settings.decayRate}/day`, inline: true },
            { name: '⏳ Grace Period', value: `${settings.decayGracePeriod} days`, inline: true },
            { name: '🎁 Auto Grant', value: settings.autoGrantOnJoin ? '✅' : '❌', inline: true },
            { name: '🎁 Grant Amount', value: `${settings.autoGrantAmount}`, inline: true },
            { name: '⚠️ Suspicious Threshold', value: `${settings.suspiciousThreshold}`, inline: true },
            { name: '⚠️ Flag on Suspicious', value: settings.flagOnSuspicious ? '✅' : '❌', inline: true },
            { name: '📈 Gain Multiplier', value: `${settings.trustGainMultiplier}x`, inline: true }
          );

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'set') {
        const key = isSlash ? interaction.options.getString('key') : (args[1] || '').toLowerCase();
        const value = isSlash ? interaction.options.getString('value') : (args.slice(2).join(' ') || '');

        if (!key || !DEFAULT_SETTINGS.hasOwnProperty(key)) {
          const embed = new EmbedBuilder()
            .setTitle('❌ Invalid Setting')
            .setDescription('Use `trustsettings view` to see available settings.')
            .setColor(0xff0000)
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        if (!value) {
          const embed = new EmbedBuilder()
            .setTitle('❌ Missing Value')
            .setDescription('Please provide a value for the setting.')
            .setColor(0xff0000)
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        let parsedValue;
        if (typeof DEFAULT_SETTINGS[key] === 'boolean') {
          parsedValue = value.toLowerCase() === 'true' || value === '1';
        } else if (typeof DEFAULT_SETTINGS[key] === 'number') {
          parsedValue = parseFloat(value);
          if (isNaN(parsedValue)) {
            const embed = new EmbedBuilder()
              .setTitle('❌ Invalid Value')
              .setDescription(`Please provide a valid number for \`${key}\`.`)
              .setColor(0xff0000)
              .setTimestamp();
            return interaction.reply({ embeds: [embed] });
          }
        } else {
          parsedValue = value;
        }

        const oldValue = settings[key];
        settings[key] = parsedValue;
        securityEngine.profiles.set(`trustSettings:${guild.id}`, settings);

        securityEngine.logIncident(guild.id, user.id, 'trust_setting_changed', {
          key,
          oldValue: String(oldValue),
          newValue: String(parsedValue),
          setBy: user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ Setting Updated')
          .setDescription(`Trust setting \`${key}\` has been updated.`)
          .addFields(
            { name: 'Setting', value: key, inline: true },
            { name: 'Old Value', value: String(oldValue), inline: true },
            { name: 'New Value', value: String(parsedValue), inline: true },
            { name: 'Changed By', value: user.tag, inline: true }
          )
          .setColor(0x00ff00)
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'reset') {
        securityEngine.profiles.set(`trustSettings:${guild.id}`, { ...DEFAULT_SETTINGS });

        securityEngine.logIncident(guild.id, user.id, 'trust_settings_reset', {
          resetBy: user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ Settings Reset')
          .setDescription('All trust system settings have been reset to defaults.')
          .setColor(0x00ff00)
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Subcommand')
        .setDescription('Available subcommands: `view`, `set`, `reset`')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to manage trust settings.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
