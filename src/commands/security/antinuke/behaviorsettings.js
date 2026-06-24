const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

const DEFAULT_SETTINGS = {
  monitoringEnabled: true,
  anomalyDetection: true,
  burstDetection: true,
  raidDetection: true,
  insiderDetection: true,
  alertThreshold: 60,
  baselineAutoCalibrate: false,
  profileRetentionDays: 30,
  trackMessageEdits: true,
  trackMessageDeletes: true,
  trackChannelChanges: true,
  trackPermissionChanges: true,
  trackRoleChanges: true
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('behaviorsettings')
    .setDescription('Manage behavior analysis settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('view').setDescription('View current behavior settings')
    )
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set a behavior setting')
        .addStringOption(opt =>
          opt.setName('key').setDescription('Setting key').setRequired(true)
            .addChoices(
              { name: 'monitoringEnabled', value: 'monitoringEnabled' },
              { name: 'anomalyDetection', value: 'anomalyDetection' },
              { name: 'burstDetection', value: 'burstDetection' },
              { name: 'raidDetection', value: 'raidDetection' },
              { name: 'insiderDetection', value: 'insiderDetection' },
              { name: 'alertThreshold', value: 'alertThreshold' },
              { name: 'baselineAutoCalibrate', value: 'baselineAutoCalibrate' },
              { name: 'profileRetentionDays', value: 'profileRetentionDays' },
              { name: 'trackMessageEdits', value: 'trackMessageEdits' },
              { name: 'trackMessageDeletes', value: 'trackMessageDeletes' },
              { name: 'trackChannelChanges', value: 'trackChannelChanges' },
              { name: 'trackPermissionChanges', value: 'trackPermissionChanges' },
              { name: 'trackRoleChanges', value: 'trackRoleChanges' }
            )
        )
        .addStringOption(opt =>
          opt.setName('value').setDescription('Value to set').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('reset').setDescription('Reset all behavior settings to defaults')
    ),
  cooldown: 5,
  aliases: ['bsettings', 'behaviorconfig'],
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
      const settings = securityEngine.profiles.get(`behaviorSettings:${guild.id}`) || { ...DEFAULT_SETTINGS };
      securityEngine.profiles.set(`behaviorSettings:${guild.id}`, settings);

      if (subcommand === 'view') {
        const embed = new EmbedBuilder()
          .setTitle('⚙️ Behavior Settings')
          .setDescription('Current behavior analysis configuration.')
          .setColor(0x5865f2)
          .setTimestamp()
          .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
          .addFields(
            { name: '🔍 Monitoring', value: settings.monitoringEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '🚨 Anomaly Detection', value: settings.anomalyDetection ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '⚡ Burst Detection', value: settings.burstDetection ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '🏴 Raid Detection', value: settings.raidDetection ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '🕵️ Insider Detection', value: settings.insiderDetection ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '🔔 Alert Threshold', value: `${settings.alertThreshold}/100`, inline: true },
            { name: '📏 Auto Calibrate', value: settings.baselineAutoCalibrate ? '✅ Yes' : '❌ No', inline: true },
            { name: '🕐 Retention', value: `${settings.profileRetentionDays} days`, inline: true }
          )
          .addFields({
            name: '📊 Tracking',
            value: `Edits: ${settings.trackMessageEdits ? '✅' : '❌'} | Deletes: ${settings.trackMessageDeletes ? '✅' : '❌'}\nChannels: ${settings.trackChannelChanges ? '✅' : '❌'} | Permissions: ${settings.trackPermissionChanges ? '✅' : '❌'}\nRoles: ${settings.trackRoleChanges ? '✅' : '❌'}`,
            inline: false
          });

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'set') {
        const key = isSlash ? interaction.options.getString('key') : (args[1] || '').toLowerCase();
        const value = isSlash ? interaction.options.getString('value') : (args.slice(2).join(' ') || '');

        if (!key || !DEFAULT_SETTINGS.hasOwnProperty(key)) {
          const embed = new EmbedBuilder()
            .setTitle('❌ Invalid Setting')
            .setDescription('Use `behaviorsettings view` to see available settings.')
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
          parsedValue = parseInt(value);
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
        securityEngine.profiles.set(`behaviorSettings:${guild.id}`, settings);

        securityEngine.logIncident(guild.id, user.id, 'behavior_setting_changed', {
          key,
          oldValue: String(oldValue),
          newValue: String(parsedValue),
          setBy: user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ Setting Updated')
          .setDescription(`Behavior setting \`${key}\` has been updated.`)
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
        securityEngine.profiles.set(`behaviorSettings:${guild.id}`, { ...DEFAULT_SETTINGS });

        securityEngine.logIncident(guild.id, user.id, 'behavior_settings_reset', {
          resetBy: user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ Settings Reset')
          .setDescription('All behavior analysis settings have been reset to defaults.')
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
        .setDescription('Failed to manage behavior settings.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
