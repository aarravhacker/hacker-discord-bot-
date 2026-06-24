const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('behaviorbaseline')
    .setDescription('Set activity baseline')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set baseline values')
        .addIntegerOption(opt =>
          opt.setName('messagesperminute').setDescription('Expected messages per minute').setMinValue(0)
        )
        .addIntegerOption(opt =>
          opt.setName('actionsperhour').setDescription('Expected actions per hour').setMinValue(0)
        )
        .addIntegerOption(opt =>
          opt.setName('joinsperminute').setDescription('Expected joins per minute').setMinValue(0)
        )
    )
    .addSubcommand(sub =>
      sub.setName('view').setDescription('View current baseline')
    )
    .addSubcommand(sub =>
      sub.setName('reset').setDescription('Reset baseline to defaults')
    ),
  cooldown: 5,
  aliases: ['bbaseline', 'setbaseline'],
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
      const baseline = securityEngine.profiles.get(`baseline:${guild.id}`) || {
        messagesPerMinute: 10,
        actionsPerHour: 50,
        joinsPerMinute: 3,
        lastCalculated: null,
        deviations: 0
      };

      if (subcommand === 'set') {
        const mpw = isSlash ? interaction.options.getInteger('messagesperminute') : parseInt(args[1]);
        const aph = isSlash ? interaction.options.getInteger('actionsperhour') : parseInt(args[2]);
        const jpm = isSlash ? interaction.options.getInteger('joinsperminute') : parseInt(args[3]);

        if (mpw !== null && mpw !== undefined && !isNaN(mpw)) baseline.messagesPerMinute = mpw;
        if (aph !== null && aph !== undefined && !isNaN(aph)) baseline.actionsPerHour = aph;
        if (jpm !== null && jpm !== undefined && !isNaN(jpm)) baseline.joinsPerMinute = jpm;

        baseline.lastCalculated = Date.now();
        securityEngine.profiles.set(`baseline:${guild.id}`, baseline);

        securityEngine.logIncident(guild.id, user.id, 'behavior_baseline_set', {
          messagesPerMinute: baseline.messagesPerMinute,
          actionsPerHour: baseline.actionsPerHour,
          joinsPerMinute: baseline.joinsPerMinute,
          setBy: user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ Baseline Updated')
          .setDescription('Activity baseline has been configured.')
          .addFields(
            { name: 'Messages/Minute', value: `**${baseline.messagesPerMinute}**`, inline: true },
            { name: 'Actions/Hour', value: `**${baseline.actionsPerHour}**`, inline: true },
            { name: 'Joins/Minute', value: `**${baseline.joinsPerMinute}**`, inline: true },
            { name: 'Set By', value: user.tag, inline: true }
          )
          .setColor(0x00ff00)
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'view') {
        const embed = new EmbedBuilder()
          .setTitle('📏 Activity Baseline')
          .setDescription('Current behavioral activity baseline for the guild.')
          .setColor(0x5865f2)
          .setTimestamp()
          .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
          .addFields(
            { name: '💬 Messages/Minute', value: `**${baseline.messagesPerMinute}**`, inline: true },
            { name: '⚡ Actions/Hour', value: `**${baseline.actionsPerHour}**`, inline: true },
            { name: '👋 Joins/Minute', value: `**${baseline.joinsPerMinute}**`, inline: true },
            { name: '📉 Deviations Recorded', value: `${baseline.deviations}`, inline: true }
          );

        if (baseline.lastCalculated) {
          embed.addFields({
            name: '🕐 Last Updated',
            value: `<t:${Math.floor(baseline.lastCalculated / 1000)}:R>`,
            inline: true
          });
        }

        embed.addFields({
          name: '📋 How Baselines Work',
          value: 'Baselines define "normal" activity levels. Deviations above the threshold trigger anomaly detection.\n\nThe system compares current activity against these baselines to identify unusual behavior patterns.',
          inline: false
        });

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'reset') {
        const defaultBaseline = {
          messagesPerMinute: 10,
          actionsPerHour: 50,
          joinsPerMinute: 3,
          lastCalculated: Date.now(),
          deviations: 0
        };
        securityEngine.profiles.set(`baseline:${guild.id}`, defaultBaseline);

        securityEngine.logIncident(guild.id, user.id, 'behavior_baseline_reset', {
          resetBy: user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ Baseline Reset')
          .setDescription('Activity baseline has been reset to defaults.')
          .addFields(
            { name: 'Messages/Minute', value: '**10**', inline: true },
            { name: 'Actions/Hour', value: '**50**', inline: true },
            { name: 'Joins/Minute', value: '**3**', inline: true }
          )
          .setColor(0x00ff00)
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Subcommand')
        .setDescription('Available subcommands: `set`, `view`, `reset`')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to manage behavior baseline.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
