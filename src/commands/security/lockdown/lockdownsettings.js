const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

const DEFAULT_SETTINGS = {
  autoLockThreshold: 5,
  graduatedEscalation: true,
  maxLockdownDuration: 3600000,
  notifyChannel: null,
  bypassRoles: [],
  lockdownLogChannel: null,
  autoUnlock: false,
  alertOnLockdown: true,
  lockTextChannels: true,
  lockVoiceChannels: true
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdownsettings')
    .setDescription('Manage lockdown settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('view').setDescription('View current lockdown settings')
    )
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set a lockdown setting')
        .addStringOption(opt =>
          opt.setName('key').setDescription('Setting key').setRequired(true)
            .addChoices(
              { name: 'autoLockThreshold', value: 'autoLockThreshold' },
              { name: 'graduatedEscalation', value: 'graduatedEscalation' },
              { name: 'maxLockdownDuration', value: 'maxLockdownDuration' },
              { name: 'autoUnlock', value: 'autoUnlock' },
              { name: 'alertOnLockdown', value: 'alertOnLockdown' },
              { name: 'lockTextChannels', value: 'lockTextChannels' },
              { name: 'lockVoiceChannels', value: 'lockVoiceChannels' }
            )
        )
        .addStringOption(opt =>
          opt.setName('value').setDescription('Value to set').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('reset').setDescription('Reset all lockdown settings to defaults')
    ),
  cooldown: 5,
  aliases: ['ldsettings', 'ldcfg'],
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
      const guildSettings = securityEngine.profiles.get(`settings:${guild.id}`) || { ...DEFAULT_SETTINGS };
      securityEngine.profiles.set(`settings:${guild.id}`, guildSettings);

      if (subcommand === 'view') {
        const embed = new EmbedBuilder()
          .setTitle('⚙️ Lockdown Settings')
          .setDescription('Current lockdown configuration.')
          .setColor(0x5865f2)
          .setTimestamp()
          .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
          .addFields(
            { name: 'Auto Lock Threshold', value: `${guildSettings.autoLockThreshold} threats`, inline: true },
            { name: 'Graduated Escalation', value: guildSettings.graduatedEscalation ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Max Duration', value: `${Math.floor(guildSettings.maxLockdownDuration / 60000)} minutes`, inline: true },
            { name: 'Auto Unlock', value: guildSettings.autoUnlock ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Alert on Lockdown', value: guildSettings.alertOnLockdown ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Lock Text Channels', value: guildSettings.lockTextChannels ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Lock Voice Channels', value: guildSettings.lockVoiceChannels ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Notify Channel', value: guildSettings.notifyChannel ? `<#${guildSettings.notifyChannel}>` : 'Not set', inline: true },
            { name: 'Log Channel', value: guildSettings.lockdownLogChannel ? `<#${guildSettings.lockdownLogChannel}>` : 'Not set', inline: true }
          );

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'set') {
        const key = isSlash ? interaction.options.getString('key') : (args[1] || '').toLowerCase();
        const value = isSlash ? interaction.options.getString('value') : (args.slice(2).join(' ') || '');

        if (!key || !DEFAULT_SETTINGS.hasOwnProperty(key)) {
          const embed = new EmbedBuilder()
            .setTitle('❌ Invalid Setting')
            .setDescription('Available settings: `autoLockThreshold`, `graduatedEscalation`, `maxLockdownDuration`, `autoUnlock`, `alertOnLockdown`, `lockTextChannels`, `lockVoiceChannels`')
            .setColor(0xff0000)
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        if (!value) {
          const embed = new EmbedBuilder()
            .setTitle('❌ Missing Value')
            .setDescription('Please provide a value for the setting.')
            .setColor(0xff0000)
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        let parsedValue;
        if (typeof DEFAULT_SETTINGS[key] === 'boolean') {
          parsedValue = value.toLowerCase() === 'true' || value === '1';
        } else if (typeof DEFAULT_SETTINGS[key] === 'number') {
          parsedValue = parseInt(value);
          if (isNaN(parsedValue)) {
            const embed = new EmbedBuilder()
              .setTitle('❌ Invalid Value')
              .setDescription(`Please provide a valid number for \`${key}\`.`)
              .setColor(0xff0000)
              .setTimestamp();
            return interaction.reply({ embeds: [embed] });
          }
        } else {
          parsedValue = value;
        }

        guildSettings[key] = parsedValue;
        securityEngine.profiles.set(`settings:${guild.id}`, guildSettings);

        securityEngine.logIncident(guild.id, user.id, 'lockdown_setting_changed', {
          key,
          oldValue: DEFAULT_SETTINGS[key],
          newValue: parsedValue,
          setBy: user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ Setting Updated')
          .setDescription(`Lockdown setting \`${key}\` has been updated.`)
          .addFields(
            { name: 'Setting', value: key, inline: true },
            { name: 'New Value', value: String(parsedValue), inline: true },
            { name: 'Changed By', value: user.tag, inline: true }
          )
          .setColor(0x00ff00)
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'reset') {
        securityEngine.profiles.set(`settings:${guild.id}`, { ...DEFAULT_SETTINGS });

        securityEngine.logIncident(guild.id, user.id, 'lockdown_settings_reset', {
          resetBy: user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ Settings Reset')
          .setDescription('All lockdown settings have been reset to defaults.')
          .setColor(0x00ff00)
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Subcommand')
        .setDescription('Available subcommands: `view`, `set`, `reset`')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to manage lockdown settings.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
