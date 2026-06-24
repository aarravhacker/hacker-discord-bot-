const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recoveryauto')
    .setDescription('Configure automatic recovery settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('enable').setDescription('Enable automatic recovery')
    )
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Disable automatic recovery')
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('View auto-recovery status')
    ),
  cooldown: 5,
  aliases: ['autorecovery', 'arecov'],
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

      if (!global.autoRecovery) global.autoRecovery = {};
      if (!global.autoRecovery[guild.id]) {
        global.autoRecovery[guild.id] = {
          enabled: false,
          autoRestoreOnNuke: true,
          autoRestoreOnRaid: false,
          notifyOnRecovery: true,
          maxRecoveryAttempts: 3,
          recoveryCooldown: 300,
          lastRecovery: null,
          totalRecoveries: 0
        };
      }
      const config = global.autoRecovery[guild.id];

      if (subcommand === 'enable') {
        config.enabled = true;
        config.enabledBy = user.tag;
        config.enabledAt = Date.now();
        global.autoRecovery[guild.id] = config;

        securityEngine.logIncident(guild.id, user.id, 'auto_recovery_enabled', {
          enabledBy: user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ Auto-Recovery Enabled')
          .setDescription('Automatic recovery is now **active**. The system will attempt to restore from snapshots when critical threats are detected.')
          .setColor(0x00ff00)
          .addFields(
            { name: 'Auto Restore on Nuke', value: config.autoRestoreOnNuke ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Auto Restore on Raid', value: config.autoRestoreOnRaid ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Max Attempts', value: `**${config.maxRecoveryAttempts}**`, inline: true },
            { name: 'Cooldown', value: `**${config.recoveryCooldown}**s`, inline: true },
            { name: 'Enabled By', value: `${user.tag}`, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'disable') {
        config.enabled = false;
        config.disabledBy = user.tag;
        config.disabledAt = Date.now();
        global.autoRecovery[guild.id] = config;

        securityEngine.logIncident(guild.id, user.id, 'auto_recovery_disabled', {
          disabledBy: user.tag,
          totalRecoveries: config.totalRecoveries
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ Auto-Recovery Disabled')
          .setDescription('Automatic recovery has been **disabled**.')
          .setColor(0xff6600)
          .addFields(
            { name: 'Disabled By', value: `${user.tag}`, inline: true },
            { name: 'Total Recoveries', value: `**${config.totalRecoveries}**`, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'status') {
        const snapshots = await securityEngine.getSnapshots(guild.id);
        const latestSnapshot = securityEngine.getLatestSnapshot(guild.id);

        const embed = new EmbedBuilder()
          .setTitle('🔄 Auto-Recovery Status')
          .setColor(config.enabled ? 0x00ff00 : 0xff6600)
          .addFields(
            { name: 'Enabled', value: config.enabled ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Auto Restore on Nuke', value: config.autoRestoreOnNuke ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Auto Restore on Raid', value: config.autoRestoreOnRaid ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Notify on Recovery', value: config.notifyOnRecovery ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Max Attempts', value: `**${config.maxRecoveryAttempts}**`, inline: true },
            { name: 'Cooldown', value: `**${config.recoveryCooldown}**s`, inline: true },
            { name: 'Total Recoveries', value: `**${config.totalRecoveries}**`, inline: true },
            { name: 'Last Recovery', value: config.lastRecovery ? `<t:${Math.floor(config.lastRecovery / 1000)}:R>` : 'Never', inline: true },
            { name: 'Available Snapshots', value: `**${snapshots?.length || 0}**`, inline: true },
            { name: 'Latest Snapshot', value: latestSnapshot ? `<t:${Math.floor(latestSnapshot.timestamp / 1000)}:R>` : 'None', inline: true }
          )
          .setTimestamp();

        if (config.enabled) {
          embed.addFields({
            name: '🛡️ Active Protections',
            value: '• Automatic snapshot restoration on critical threats\n• Raid recovery with member rollback\n• Emergency stage auto-escalation\n• Notification routing on recovery',
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
        .setDescription('An error occurred while configuring auto-recovery.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
