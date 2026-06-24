const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trustdecay')
    .setDescription('Configure trust decay')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set trust decay settings')
        .addIntegerOption(opt =>
          opt.setName('rate').setDescription('Decay rate per day (1-10)').setMinValue(1).setMaxValue(10).setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('graceperiod').setDescription('Grace period in days before decay starts (1-30)').setMinValue(1).setMaxValue(30)
        )
    )
    .addSubcommand(sub =>
      sub.setName('view').setDescription('View current trust decay settings')
    )
    .addSubcommand(sub =>
      sub.setName('enable').setDescription('Enable trust decay')
    )
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Disable trust decay')
    ),
  cooldown: 5,
  aliases: ['trdecay', 'trustconfigdecay'],
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
      const decaySettings = securityEngine.profiles.get(`trustDecay:${guild.id}`) || {
        enabled: false,
        rate: 2,
        gracePeriod: 7,
        lastApplied: null,
        totalDecayed: 0
      };

      if (subcommand === 'set') {
        const rate = isSlash ? interaction.options.getInteger('rate') : parseInt(args[1]);
        const gracePeriod = isSlash ? (interaction.options.getInteger('graceperiod') || 7) : (parseInt(args[2]) || 7);

        if (!rate || rate < 1 || rate > 10) {
          const embed = new EmbedBuilder()
            .setTitle('❌ Invalid Rate')
            .setDescription('Please provide a valid decay rate between 1 and 10.')
            .setColor(0xff0000)
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        decaySettings.rate = rate;
        decaySettings.gracePeriod = gracePeriod;
        securityEngine.profiles.set(`trustDecay:${guild.id}`, decaySettings);

        securityEngine.logIncident(guild.id, user.id, 'trust_decay_configured', {
          rate,
          gracePeriod,
          configuredBy: user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ Trust Decay Configured')
          .setDescription('Trust decay settings have been updated.')
          .addFields(
            { name: 'Status', value: decaySettings.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Decay Rate', value: `**${rate}** points per day`, inline: true },
            { name: 'Grace Period', value: `**${gracePeriod}** days`, inline: true },
            { name: 'Configured By', value: user.tag, inline: true }
          )
          .setColor(0x00ff00)
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'view') {
        const embed = new EmbedBuilder()
          .setTitle('⏳ Trust Decay Settings')
          .setDescription('Current trust decay configuration.')
          .setColor(0x5865f2)
          .setTimestamp()
          .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
          .addFields(
            { name: 'Enabled', value: decaySettings.enabled ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Decay Rate', value: `**${decaySettings.rate}** points per day`, inline: true },
            { name: 'Grace Period', value: `**${decaySettings.gracePeriod}** days`, inline: true },
            { name: 'Total Decayed', value: `${decaySettings.totalDecayed} points`, inline: true }
          );

        if (decaySettings.lastApplied) {
          embed.addFields({
            name: 'Last Applied',
            value: `<t:${Math.floor(decaySettings.lastApplied / 1000)}:R>`,
            inline: true
          });
        }

        embed.addFields({
          name: '📋 How Decay Works',
          value: `After **${decaySettings.gracePeriod}** days of inactivity, a member's trust score decays by **${decaySettings.rate}** points per day.\nMinimum trust score: **0**\nDecay stops at minimum score.`,
          inline: false
        });

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'enable') {
        decaySettings.enabled = true;
        securityEngine.profiles.set(`trustDecay:${guild.id}`, decaySettings);

        securityEngine.logIncident(guild.id, user.id, 'trust_decay_enabled', {
          enabledBy: user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ Trust Decay Enabled')
          .setDescription(`Trust decay has been enabled.\nMembers inactive for more than **${decaySettings.gracePeriod}** days will lose **${decaySettings.rate}** trust points per day.`)
          .setColor(0x00ff00)
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'disable') {
        decaySettings.enabled = false;
        securityEngine.profiles.set(`trustDecay:${guild.id}`, decaySettings);

        securityEngine.logIncident(guild.id, user.id, 'trust_decay_disabled', {
          disabledBy: user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle('❌ Trust Decay Disabled')
          .setDescription('Trust decay has been disabled. Trust scores will no longer decrease over time.')
          .setColor(0xffa500)
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Subcommand')
        .setDescription('Available subcommands: `set`, `view`, `enable`, `disable`')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to manage trust decay.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
