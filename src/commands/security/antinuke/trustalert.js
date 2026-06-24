const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trustalert')
    .setDescription('Configure trust alerts')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set trust alert threshold')
        .addIntegerOption(opt =>
          opt.setName('threshold').setDescription('Trust score threshold for alerts (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Channel for trust alerts')
        )
    )
    .addSubcommand(sub =>
      sub.setName('view').setDescription('View current trust alert settings')
    )
    .addSubcommand(sub =>
      sub.setName('test')
        .setDescription('Test trust alert with a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User to test alert with').setRequired(true)
        )
    ),
  cooldown: 5,
  aliases: ['tralert', 'trustnotification'],
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
      const alertSettings = securityEngine.profiles.get(`trustAlert:${guild.id}`) || {
        threshold: 20,
        enabled: true,
        channelId: null,
        alertCount: 0
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

        securityEngine.profiles.set(`trustAlert:${guild.id}`, alertSettings);

        securityEngine.logIncident(guild.id, user.id, 'trust_alert_configured', {
          threshold,
          channelId: alertSettings.channelId,
          configuredBy: user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ Trust Alert Configured')
          .setDescription('Trust alert settings have been updated.')
          .addFields(
            { name: 'Threshold', value: `Trust score below **${threshold}** will trigger alerts`, inline: true },
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
          .setTitle('🔔 Trust Alert Settings')
          .setDescription('Current trust alert configuration.')
          .setColor(0x5865f2)
          .setTimestamp()
          .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
          .addFields(
            { name: 'Enabled', value: alertSettings.enabled ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Threshold', value: `${alertSettings.threshold}/100`, inline: true },
            { name: 'Alert Channel', value: alertSettings.channelId ? `<#${alertSettings.channelId}>` : 'Default channel', inline: true },
            { name: 'Alerts Triggered', value: `${alertSettings.alertCount}`, inline: true }
          );

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

        const trustLevel = securityEngine.getTrustLevel(guild.id, targetUser.id);
        const wouldAlert = trustLevel.score < alertSettings.threshold;

        const embed = new EmbedBuilder()
          .setTitle('🧪 Trust Alert Test')
          .setDescription(`Testing trust alert for **${targetUser.tag}**.`)
          .setColor(wouldAlert ? 0xed4245 : 0x57f287)
          .setTimestamp()
          .setThumbnail(targetUser.displayAvatarURL())
          .addFields(
            { name: 'Trust Score', value: `**${trustLevel.score}**/100`, inline: true },
            { name: 'Alert Threshold', value: `${alertSettings.threshold}/100`, inline: true },
            { name: 'Would Trigger Alert', value: wouldAlert ? '🚨 Yes' : '✅ No', inline: true },
            { name: 'Trust Level', value: `${trustLevel.level} - ${trustLevel.label}`, inline: true }
          );

        if (wouldAlert) {
          embed.addFields({
            name: '🚨 Alert Preview',
            value: `**TRUST ALERT**\nUser **${targetUser.tag}** has a trust score of **${trustLevel.score}** (below threshold of ${alertSettings.threshold}).\nTrust Level: ${trustLevel.label} | Flagged: ${trustLevel.isFlagged ? 'Yes' : 'No'}`,
            inline: false
          });
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
        .setDescription('Failed to manage trust alerts.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
