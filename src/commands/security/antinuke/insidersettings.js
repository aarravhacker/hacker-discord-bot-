const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

const defaultSettings = {
  scanInterval: 300,
  autoScan: false,
  alertOnThreat: true,
  minThreatLevel: 'medium',
  logChannel: null,
  whitelistedUsers: [],
  monitorNewJoins: true,
  trackPermissionChanges: true,
  trackChannelChanges: true,
  maxRiskBeforeRestrict: 80
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('insidersettings')
    .setDescription('Configure insider detection settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('view').setDescription('View current insider settings')
    )
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Update insider settings')
        .addBooleanOption(opt =>
          opt.setName('autoscan').setDescription('Enable automatic scanning')
        )
        .addIntegerOption(opt =>
          opt.setName('interval').setDescription('Scan interval in seconds').setMinValue(60).setMaxValue(3600)
        )
        .addStringOption(opt =>
          opt.setName('minlevel').setDescription('Minimum threat level to alert')
            .addChoices(
              { name: 'Low', value: 'low' },
              { name: 'Medium', value: 'medium' },
              { name: 'High', value: 'high' },
              { name: 'Critical', value: 'critical' }
            )
        )
        .addChannelOption(opt =>
          opt.setName('logchannel').setDescription('Logging channel')
        )
        .addBooleanOption(opt =>
          opt.setName('alertonthreat').setDescription('Alert when threat detected')
        )
        .addBooleanOption(opt =>
          opt.setName('monitorjoins').setDescription('Monitor new member joins')
        )
        .addBooleanOption(opt =>
          opt.setName('trackperms').setDescription('Track permission changes')
        )
        .addBooleanOption(opt =>
          opt.setName('trackchannels').setDescription('Track channel changes')
        )
        .addIntegerOption(opt =>
          opt.setName('maxrisk').setDescription('Max risk before auto-restrict').setMinValue(0).setMaxValue(100)
        )
    )
    .addSubcommand(sub =>
      sub.setName('reset').setDescription('Reset all insider settings to defaults')
    ),
  cooldown: 5,
  aliases: ['isettings', 'insidersettings'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    try {
      if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription('You need Administrator permission to use this command.');
        return interaction.reply({ embeds: [embed] });
      }

      const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || '').toLowerCase();

      if (!global.insiderSettings) global.insiderSettings = {};
      if (!global.insiderSettings[guild.id]) {
        global.insiderSettings[guild.id] = { ...defaultSettings };
      }
      const settings = global.insiderSettings[guild.id];

      if (subcommand === 'view') {
        const embed = new EmbedBuilder()
          .setTitle('🕵️ Insider Detection Settings')
          .setColor(0x0099ff)
          .setTimestamp()
          .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
          .addFields(
            { name: 'Auto Scan', value: settings.autoScan ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Scan Interval', value: `**${settings.scanInterval}**s`, inline: true },
            { name: 'Min Alert Level', value: `**${settings.minThreatLevel.toUpperCase()}**`, inline: true },
            { name: 'Alert on Threat', value: settings.alertOnThreat ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Log Channel', value: settings.logChannel ? `<#${settings.logChannel}>` : 'Not set', inline: true },
            { name: 'Max Risk Before Restrict', value: `**${settings.maxRiskBeforeRestrict}**/100`, inline: true },
            { name: 'Monitor New Joins', value: settings.monitorNewJoins ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Track Permission Changes', value: settings.trackPermissionChanges ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Track Channel Changes', value: settings.trackChannelChanges ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Whitelisted Users', value: `**${settings.whitelistedUsers.length}** users`, inline: true }
          );
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'set') {
        const autoScan = isSlash ? interaction.options.getBoolean('autoscan') : null;
        const interval = isSlash ? interaction.options.getInteger('interval') : parseInt(args[1]);
        const minLevel = isSlash ? interaction.options.getString('minlevel') : (args[2] || '').toLowerCase();
        const logChannel = isSlash ? interaction.options.getChannel('logchannel') : null;
        const alertOnThreat = isSlash ? interaction.options.getBoolean('alertonthreat') : null;
        const monitorJoins = isSlash ? interaction.options.getBoolean('monitorjoins') : null;
        const trackPerms = isSlash ? interaction.options.getBoolean('trackperms') : null;
        const trackChannels = isSlash ? interaction.options.getBoolean('trackchannels') : null;
        const maxRisk = isSlash ? interaction.options.getInteger('maxrisk') : parseInt(args[3]);

        let updated = [];

        if (autoScan !== null) { settings.autoScan = autoScan; updated.push('Auto Scan'); }
        if (!isNaN(interval)) { settings.scanInterval = interval; updated.push('Scan Interval'); }
        if (minLevel && ['low', 'medium', 'high', 'critical'].includes(minLevel)) {
          settings.minThreatLevel = minLevel;
          updated.push('Min Alert Level');
        }
        if (logChannel) { settings.logChannel = logChannel.id; updated.push('Log Channel'); }
        if (alertOnThreat !== null) { settings.alertOnThreat = alertOnThreat; updated.push('Alert on Threat'); }
        if (monitorJoins !== null) { settings.monitorNewJoins = monitorJoins; updated.push('Monitor New Joins'); }
        if (trackPerms !== null) { settings.trackPermissionChanges = trackPerms; updated.push('Track Permission Changes'); }
        if (trackChannels !== null) { settings.trackChannelChanges = trackChannels; updated.push('Track Channel Changes'); }
        if (!isNaN(maxRisk)) { settings.maxRiskBeforeRestrict = maxRisk; updated.push('Max Risk Before Restrict'); }

        global.insiderSettings[guild.id] = settings;

        const embed = new EmbedBuilder()
          .setTitle('✅ Insider Settings Updated')
          .setColor(0x57f287)
          .setDescription(updated.length > 0 ? `Updated: ${updated.join(', ')}` : 'No settings were changed.')
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'reset') {
        global.insiderSettings[guild.id] = { ...defaultSettings };

        const embed = new EmbedBuilder()
          .setTitle('✅ Insider Settings Reset')
          .setColor(0x57f287)
          .setDescription('All insider detection settings have been reset to defaults.')
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription('Invalid subcommand. Use `view`, `set`, or `reset`.');
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while configuring insider settings.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
