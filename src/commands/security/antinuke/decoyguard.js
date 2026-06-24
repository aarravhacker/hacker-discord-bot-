const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('decoyguard')
    .setDescription('Enable or disable decoy guard mode')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('enable').setDescription('Enable decoy guard mode')
    )
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Disable decoy guard mode')
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Check decoy guard status')
    ),
  cooldown: 5,
  aliases: ['dguard', 'decoyguard'],
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

      if (!global.decoyGuard) global.decoyGuard = {};
      const guardState = global.decoyGuard[guild.id] || {
        enabled: false,
        activatedAt: null,
        activatedBy: null,
        triggeredAlerts: 0,
        blockedAttempts: 0
      };

      if (subcommand === 'enable') {
        guardState.enabled = true;
        guardState.activatedAt = Date.now();
        guardState.activatedBy = user.tag;
        guardState.triggeredAlerts = 0;
        guardState.blockedAttempts = 0;
        global.decoyGuard[guild.id] = guardState;

        securityEngine.logIncident(guild.id, user.id, 'decoy_guard_enabled', {
          activatedBy: user.tag
        });

        const decoys = securityEngine.getDecoys(guild.id);

        const embed = new EmbedBuilder()
          .setTitle('🪤 Decoy Guard Enabled')
          .setDescription('Decoy guard mode is now **active**. All decoys are under enhanced monitoring.')
          .setColor(0x00ff00)
          .addFields(
            { name: 'Activated By', value: `${user.tag}`, inline: true },
            { name: 'Active Decoys', value: `**${decoys.length}**`, inline: true },
            { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
          )
          .addFields({
            name: 'What This Does',
            value: '• Enhanced monitoring of all decoy interactions\n• Immediate alerts on any decoy trigger\n• Automatic incident logging for triggered decoys\n• Priority notification routing',
            inline: false
          })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'disable') {
        if (!guardState.enabled) {
          const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription('Decoy guard mode is already disabled.');
          return interaction.reply({ embeds: [embed] });
        }

        guardState.enabled = false;
        guardState.deactivatedAt = Date.now();
        global.decoyGuard[guild.id] = guardState;

        securityEngine.logIncident(guild.id, user.id, 'decoy_guard_disabled', {
          deactivatedBy: user.tag,
          triggeredAlerts: guardState.triggeredAlerts,
          blockedAttempts: guardState.blockedAttempts
        });

        const embed = new EmbedBuilder()
          .setTitle('🪤 Decoy Guard Disabled')
          .setDescription('Decoy guard mode has been **deactivated**.')
          .setColor(0xff6600)
          .addFields(
            { name: 'Deactivated By', value: `${user.tag}`, inline: true },
            { name: 'Triggered Alerts', value: `**${guardState.triggeredAlerts}**`, inline: true },
            { name: 'Blocked Attempts', value: `**${guardState.blockedAttempts}**`, inline: true },
            { name: 'Duration', value: guardState.activatedAt ? `<t:${Math.floor(guardState.activatedAt / 1000)}:R> to now` : 'Unknown', inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'status') {
        let color = 0x00ff00;
        let statusText = 'Inactive';
        if (guardState.enabled) {
          color = 0xff6600;
          statusText = 'Active';
        }

        const decoys = securityEngine.getDecoys(guild.id);
        const triggered = decoys.filter(d => d.triggered);

        const embed = new EmbedBuilder()
          .setTitle('🪤 Decoy Guard Status')
          .setColor(color)
          .addFields(
            { name: 'Status', value: `**${statusText}**`, inline: true },
            { name: 'Total Decoys', value: `**${decoys.length}**`, inline: true },
            { name: 'Triggered', value: `**${triggered.length}**`, inline: true },
            { name: 'Alerts During Session', value: `**${guardState.triggeredAlerts}**`, inline: true },
            { name: 'Activated By', value: guardState.activatedBy || 'N/A', inline: true },
            { name: 'Activated At', value: guardState.activatedAt ? `<t:${Math.floor(guardState.activatedAt / 1000)}:R>` : 'N/A', inline: true }
          )
          .setTimestamp();

        if (guardState.enabled) {
          embed.addFields({
            name: 'Active Protections',
            value: '• Real-time decoy interaction monitoring\n• Instant trigger alerts\n• Automatic incident logging\n• Priority notification routing',
            inline: false
          });
        }

        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription('Invalid subcommand. Use `enable`, `disable`, or `status`.');
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while toggling decoy guard.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
