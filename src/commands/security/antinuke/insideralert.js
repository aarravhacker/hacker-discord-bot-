const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

const defaultConfig = {
  enabled: true,
  criticalThreshold: 80,
  highThreshold: 50,
  mediumThreshold: 25,
  alertChannel: null,
  notifyAdmins: true,
  autoRestrict: false
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('insideralert')
    .setDescription('Configure insider threat alerts')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Configure insider alert settings')
        .addIntegerOption(opt =>
          opt.setName('critical').setDescription('Critical threshold (0-100)').setMinValue(0).setMaxValue(100)
        )
        .addIntegerOption(opt =>
          opt.setName('high').setDescription('High threshold (0-100)').setMinValue(0).setMaxValue(100)
        )
        .addIntegerOption(opt =>
          opt.setName('medium').setDescription('Medium threshold (0-100)').setMinValue(0).setMaxValue(100)
        )
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Alert channel')
        )
        .addBooleanOption(opt =>
          opt.setName('notify').setDescription('Notify admins on alerts')
        )
        .addBooleanOption(opt =>
          opt.setName('autorestrict').setDescription('Auto-restrict high threat staff')
        )
    )
    .addSubcommand(sub =>
      sub.setName('view').setDescription('View current insider alert settings')
    )
    .addSubcommand(sub =>
      sub.setName('test').setDescription('Send a test alert to verify configuration')
    ),
  cooldown: 5,
  aliases: ['ialert', 'insideralert'],
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
      const configKey = `insider_alert_${guild.id}`;

      if (!global.insiderAlertConfig) global.insiderAlertConfig = {};
      if (!global.insiderAlertConfig[guild.id]) {
        global.insiderAlertConfig[guild.id] = { ...defaultConfig };
      }
      const config = global.insiderAlertConfig[guild.id];

      if (subcommand === 'set') {
        const critical = isSlash ? interaction.options.getInteger('critical') : parseInt(args[1]);
        const high = isSlash ? interaction.options.getInteger('high') : parseInt(args[2]);
        const medium = isSlash ? interaction.options.getInteger('medium') : parseInt(args[3]);
        const channel = isSlash ? interaction.options.getChannel('channel') : null;
        const notify = isSlash ? interaction.options.getBoolean('notify') : null;
        const autoRestrict = isSlash ? interaction.options.getBoolean('autorestrict') : null;

        if (!isNaN(critical)) config.criticalThreshold = critical;
        if (!isNaN(high)) config.highThreshold = high;
        if (!isNaN(medium)) config.mediumThreshold = medium;
        if (channel) config.alertChannel = channel.id;
        if (notify !== null) config.notifyAdmins = notify;
        if (autoRestrict !== null) config.autoRestrict = autoRestrict;

        global.insiderAlertConfig[guild.id] = config;

        const embed = new EmbedBuilder()
          .setTitle('✅ Insider Alert Settings Updated')
          .setColor(0x57f287)
          .addFields(
            { name: 'Critical Threshold', value: `**${config.criticalThreshold}**`, inline: true },
            { name: 'High Threshold', value: `**${config.highThreshold}**`, inline: true },
            { name: 'Medium Threshold', value: `**${config.mediumThreshold}**`, inline: true },
            { name: 'Alert Channel', value: config.alertChannel ? `<#${config.alertChannel}>` : 'Not set', inline: true },
            { name: 'Notify Admins', value: config.notifyAdmins ? 'Yes' : 'No', inline: true },
            { name: 'Auto Restrict', value: config.autoRestrict ? 'Yes' : 'No', inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'view') {
        const embed = new EmbedBuilder()
          .setTitle('🕵️ Insider Alert Configuration')
          .setColor(0x0099ff)
          .addFields(
            { name: 'Enabled', value: config.enabled ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Critical Threshold', value: `**${config.criticalThreshold}**`, inline: true },
            { name: 'High Threshold', value: `**${config.highThreshold}**`, inline: true },
            { name: 'Medium Threshold', value: `**${config.mediumThreshold}**`, inline: true },
            { name: 'Alert Channel', value: config.alertChannel ? `<#${config.alertChannel}>` : 'Not set', inline: true },
            { name: 'Notify Admins', value: config.notifyAdmins ? 'Yes' : 'No', inline: true },
            { name: 'Auto Restrict', value: config.autoRestrict ? 'Yes' : 'No', inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'test') {
        const embed = new EmbedBuilder()
          .setTitle('🔔 Test Insider Alert')
          .setDescription('This is a test alert to verify your insider alert configuration is working correctly.')
          .setColor(0xffa500)
          .addFields(
            { name: 'Alert Channel', value: config.alertChannel ? `<#${config.alertChannel}>` : 'Not configured', inline: true },
            { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            { name: 'Triggered By', value: `${user.tag}`, inline: true }
          )
          .setFooter({ text: 'If you received this, your alerts are working.' })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription('Invalid subcommand. Use `set`, `view`, or `test`.');
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while configuring insider alerts.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
