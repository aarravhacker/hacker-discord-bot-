const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

const defaultDecoySettings = {
  maxDecoys: 10,
  alertOnTrigger: true,
  autoCreateOnJoin: false,
  decoyTypes: ['channel', 'role'],
  logChannel: null,
  expireDays: 30,
  notifyAdmins: true
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('decoysettings')
    .setDescription('Configure decoy system settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('view').setDescription('View current decoy settings')
    )
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Update decoy settings')
        .addIntegerOption(opt =>
          opt.setName('max').setDescription('Maximum decoys allowed').setMinValue(1).setMaxValue(50)
        )
        .addBooleanOption(opt =>
          opt.setName('alert').setDescription('Alert on decoy trigger')
        )
        .addBooleanOption(opt =>
          opt.setName('auto').setDescription('Auto-create decoys on new joins')
        )
        .addChannelOption(opt =>
          opt.setName('logchannel').setDescription('Decoy log channel')
        )
        .addIntegerOption(opt =>
          opt.setName('expire').setDescription('Decoy expiry in days').setMinValue(1).setMaxValue(365)
        )
        .addBooleanOption(opt =>
          opt.setName('notify').setDescription('Notify admins on trigger')
        )
    )
    .addSubcommand(sub =>
      sub.setName('reset').setDescription('Reset decoy settings to defaults')
    ),
  cooldown: 5,
  aliases: ['decoycfg', 'dsettings'],
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

      if (!global.decoySettings) global.decoySettings = {};
      if (!global.decoySettings[guild.id]) {
        global.decoySettings[guild.id] = { ...defaultDecoySettings };
      }
      const settings = global.decoySettings[guild.id];

      if (subcommand === 'view') {
        const decoys = securityEngine.getDecoys(guild.id);
        const embed = new EmbedBuilder()
          .setTitle('🪤 Decoy Settings')
          .setColor(0x0099ff)
          .setTimestamp()
          .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
          .addFields(
            { name: 'Max Decoys', value: `**${settings.maxDecoys}**`, inline: true },
            { name: 'Current Decoys', value: `**${decoys.length}**`, inline: true },
            { name: 'Alert on Trigger', value: settings.alertOnTrigger ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Auto Create', value: settings.autoCreateOnJoin ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Log Channel', value: settings.logChannel ? `<#${settings.logChannel}>` : 'Not set', inline: true },
            { name: 'Expire Days', value: `**${settings.expireDays}**`, inline: true },
            { name: 'Notify Admins', value: settings.notifyAdmins ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Allowed Types', value: settings.decoyTypes.join(', '), inline: true }
          );
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'set') {
        const max = isSlash ? interaction.options.getInteger('max') : parseInt(args[1]);
        const alert = isSlash ? interaction.options.getBoolean('alert') : null;
        const auto = isSlash ? interaction.options.getBoolean('auto') : null;
        const logChannel = isSlash ? interaction.options.getChannel('logchannel') : null;
        const expire = isSlash ? interaction.options.getInteger('expire') : parseInt(args[2]);
        const notify = isSlash ? interaction.options.getBoolean('notify') : null;

        let updated = [];
        if (!isNaN(max)) { settings.maxDecoys = max; updated.push('Max Decoys'); }
        if (alert !== null) { settings.alertOnTrigger = alert; updated.push('Alert on Trigger'); }
        if (auto !== null) { settings.autoCreateOnJoin = auto; updated.push('Auto Create'); }
        if (logChannel) { settings.logChannel = logChannel.id; updated.push('Log Channel'); }
        if (!isNaN(expire)) { settings.expireDays = expire; updated.push('Expire Days'); }
        if (notify !== null) { settings.notifyAdmins = notify; updated.push('Notify Admins'); }

        global.decoySettings[guild.id] = settings;

        const embed = new EmbedBuilder()
          .setTitle('✅ Decoy Settings Updated')
          .setColor(0x57f287)
          .setDescription(updated.length > 0 ? `Updated: ${updated.join(', ')}` : 'No settings were changed.')
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'reset') {
        global.decoySettings[guild.id] = { ...defaultDecoySettings };
        const embed = new EmbedBuilder()
          .setTitle('✅ Decoy Settings Reset')
          .setColor(0x57f287)
          .setDescription('All decoy settings have been reset to defaults.')
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
        .setDescription('An error occurred while configuring decoy settings.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
