const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('behavioralert')
    .setDescription('Configure behavior alerts')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set behavior alert settings')
        .addIntegerOption(opt =>
          opt.setName('threshold').setDescription('Risk score threshold for alerts (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Channel for behavior alerts')
        )
    )
    .addSubcommand(sub =>
      sub.setName('view').setDescription('View current behavior alert settings')
    )
    .addSubcommand(sub =>
      sub.setName('test')
        .setDescription('Test behavior alert with a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User to test alert with').setRequired(true)
        )
    ),
  cooldown: 5,
  aliases: ['balert', 'behavioralertconfig'],
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
      const alertSettings = securityEngine.profiles.get(`behaviorAlert:${guild.id}`) || {
        threshold: 60,
        enabled: true,
        channelId: null,
        alertCount: 0,
        lastAlert: null
      };

      if (subcommand === 'set') {
        const threshold = isSlash ? interaction.options.getInteger('threshold') : parseInt(args[1]);
        const channel = isSlash ? interaction.options.getChannel('channel') : null;

        if (!threshold || threshold < 1 || threshold > 100) {
          const embed = new EmbedBuilder()
            .setTitle('❌ Invalid Threshold')
            .setDescription('Please provide a valid threshold between 1 and 100.')
            .setColor(0xff0000)
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        alertSettings.threshold = threshold;
        alertSettings.enabled = true;
        if (channel) alertSettings.channelId = channel.id;

        securityEngine.profiles.set(`behaviorAlert:${guild.id}`, alertSettings);

        securityEngine.logIncident(guild.id, user.id, 'behavior_alert_configured', {
          threshold,
          channelId: alertSettings.channelId,
          configuredBy: user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ Behavior Alert Configured')
          .setDescription('Behavior alert settings have been updated.')
          .addFields(
            { name: 'Threshold', value: `Risk score above **${threshold}** will trigger alerts`, inline: true },
            { name: 'Alert Channel', value: alertSettings.channelId ? `<#${alertSettings.channelId}>` : 'Default channel', inline: true },
            { name: 'Status', value: '✅ Enabled', inline: true },
            { name: 'Configured By', value: user.tag, inline: true }
          )
          .setColor(0x00ff00)
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'view') {
        const embed = new EmbedBuilder()
          .setTitle('🔔 Behavior Alert Settings')
          .setDescription('Current behavior alert configuration.')
          .setColor(0x5865f2)
          .setTimestamp()
          .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
          .addFields(
            { name: 'Enabled', value: alertSettings.enabled ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Threshold', value: `${alertSettings.threshold}/100 risk`, inline: true },
            { name: 'Alert Channel', value: alertSettings.channelId ? `<#${alertSettings.channelId}>` : 'Default channel', inline: true },
            { name: 'Alerts Triggered', value: `${alertSettings.alertCount}`, inline: true }
          );

        if (alertSettings.lastAlert) {
          embed.addFields({
            name: 'Last Alert',
            value: `<t:${Math.floor(alertSettings.lastAlert / 1000)}:R>`,
            inline: true
          });
        }

        embed.addFields({
          name: '📋 How Alerts Work',
          value: `When a member's risk score exceeds **${alertSettings.threshold}**, a behavior alert is triggered.\nAlerts are sent to ${alertSettings.channelId ? `<#${alertSettings.channelId}>` : 'the default channel'}.`,
          inline: false
        });

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'test') {
        const targetUser = isSlash ? interaction.options.getUser('user') :
          await guild.members.fetch((args[1] || '').replace(/[<@!>]/g, '')).then(m => m.user).catch(() => null);

        if (!targetUser) {
          const embed = new EmbedBuilder()
            .setTitle('❌ Invalid User')
            .setDescription('Please specify a valid user to test.')
            .setColor(0xff0000)
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        const profile = securityEngine.getProfile(guild.id, targetUser.id);
        const risk = securityEngine.calculateRisk(guild.id, targetUser.id);
        const wouldAlert = risk >= alertSettings.threshold;

        const embed = new EmbedBuilder()
          .setTitle('🧪 Behavior Alert Test')
          .setDescription(`Testing behavior alert for **${targetUser.tag}**.`)
          .setColor(wouldAlert ? 0xed4245 : 0x57f287)
          .setTimestamp()
          .setThumbnail(targetUser.displayAvatarURL())
          .addFields(
            { name: 'Risk Score', value: `**${risk}**/100`, inline: true },
            { name: 'Alert Threshold', value: `${alertSettings.threshold}/100`, inline: true },
            { name: 'Would Trigger Alert', value: wouldAlert ? '🚨 Yes' : '✅ No', inline: true }
          );

        if (wouldAlert) {
          embed.addFields({
            name: '🚨 Alert Preview',
            value: `**BEHAVIOR ALERT**\nUser **${targetUser.tag}** has a risk score of **${risk}** (above threshold of ${alertSettings.threshold}).\nAnomalies: ${profile.anomalies.length} | Messages: ${profile.messageCount}`,
            inline: false
          });
        }

        if (profile.anomalies.length > 0) {
          const anomalyList = profile.anomalies.slice(-3).map(a =>
            `• **${a.type}** (${a.severity})`
          ).join('\n');
          embed.addFields({ name: 'Recent Anomalies', value: anomalyList, inline: false });
        }

        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Subcommand')
        .setDescription('Available subcommands: `set`, `view`, `test`')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to manage behavior alerts.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
