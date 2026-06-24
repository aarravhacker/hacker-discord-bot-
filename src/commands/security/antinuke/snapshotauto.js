const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('snapshotauto')
    .setDescription('Configure automatic snapshot settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('enable').setDescription('Enable automatic snapshots')
    )
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Disable automatic snapshots')
    )
    .addSubcommand(sub =>
      sub.setName('interval')
        .setDescription('Set snapshot interval')
        .addIntegerOption(opt =>
          opt.setName('minutes').setDescription('Interval in minutes').setRequired(true).setMinValue(5).setMaxValue(1440)
        )
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('View auto-snapshot status')
    ),
  cooldown: 5,
  aliases: ['autosnap', 'snapauto'],
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

      if (!global.autoSnapshot) global.autoSnapshot = {};
      if (!global.autoSnapshot[guild.id]) {
        global.autoSnapshot[guild.id] = {
          enabled: false,
          interval: 60,
          lastSnapshot: null,
          totalSnapshots: 0
        };
      }
      const config = global.autoSnapshot[guild.id];

      if (subcommand === 'enable') {
        config.enabled = true;
        config.enabledBy = user.tag;
        config.enabledAt = Date.now();
        global.autoSnapshot[guild.id] = config;

        securityEngine.logIncident(guild.id, user.id, 'auto_snapshot_enabled', {
          interval: config.interval,
          enabledBy: user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ Auto-Snapshot Enabled')
          .setDescription('Automatic snapshots are now **active**.')
          .setColor(0x00ff00)
          .addFields(
            { name: 'Interval', value: `Every **${config.interval}** minutes`, inline: true },
            { name: 'Enabled By', value: `${user.tag}`, inline: true },
            { name: 'Total Snapshots', value: `**${config.totalSnapshots}**`, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'disable') {
        config.enabled = false;
        config.disabledBy = user.tag;
        config.disabledAt = Date.now();
        global.autoSnapshot[guild.id] = config;

        securityEngine.logIncident(guild.id, user.id, 'auto_snapshot_disabled', {
          disabledBy: user.tag,
          totalSnapshots: config.totalSnapshots
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ Auto-Snapshot Disabled')
          .setDescription('Automatic snapshots have been **disabled**.')
          .setColor(0xff6600)
          .addFields(
            { name: 'Disabled By', value: `${user.tag}`, inline: true },
            { name: 'Total Snapshots Taken', value: `**${config.totalSnapshots}**`, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'interval') {
        const minutes = isSlash ? interaction.options.getInteger('minutes') : parseInt(args[1]);

        if (isNaN(minutes) || minutes < 5 || minutes > 1440) {
          const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription('Please provide an interval between 5 and 1440 minutes.');
          return interaction.reply({ embeds: [embed] });
        }

        config.interval = minutes;
        global.autoSnapshot[guild.id] = config;

        const embed = new EmbedBuilder()
          .setTitle('✅ Snapshot Interval Updated')
          .setDescription(`Snapshot interval set to **${minutes}** minutes.`)
          .setColor(0x57f287)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'status') {
        const embed = new EmbedBuilder()
          .setTitle('📸 Auto-Snapshot Status')
          .setColor(config.enabled ? 0x00ff00 : 0xff6600)
          .addFields(
            { name: 'Enabled', value: config.enabled ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Interval', value: `**${config.interval}** minutes`, inline: true },
            { name: 'Total Snapshots', value: `**${config.totalSnapshots}**`, inline: true },
            { name: 'Last Snapshot', value: config.lastSnapshot ? `<t:${Math.floor(config.lastSnapshot / 1000)}:R>` : 'Never', inline: true },
            { name: 'Enabled By', value: config.enabledBy || 'N/A', inline: true },
            { name: 'Enabled At', value: config.enabledAt ? `<t:${Math.floor(config.enabledAt / 1000)}:R>` : 'N/A', inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription('Invalid subcommand. Use `enable`, `disable`, `interval`, or `status`.');
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while configuring auto-snapshots.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
