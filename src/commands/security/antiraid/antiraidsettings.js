const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraidsettings')
    .setDescription('Quick settings for anti-raid')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View current anti-raid settings')
    )
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set anti-raid settings')
        .addStringOption(opt =>
          opt.setName('setting')
            .setDescription('Setting to change')
            .setRequired(true)
            .addChoices(
              { name: 'Detection Threshold', value: 'threshold' },
              { name: 'Auto-Action', value: 'autoAction' },
              { name: 'Alert Channel', value: 'alertChannel' },
              { name: 'Log Level', value: 'logLevel' }
            )
        )
        .addStringOption(opt =>
          opt.setName('value')
            .setDescription('Value to set')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset all settings to defaults')
    ),
  cooldown: 5,
  aliases: ['arsettings'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'view');

    if (subcommand === 'view') {
      const settings = await securityEngine.getRaidSettings(interaction.guild.id);
      const embed = new EmbedBuilder()
        .setTitle('Anti-Raid Settings')
        .setDescription(`Current settings for **${interaction.guild.name}**`)
        .setColor(0x0099ff)
        .addFields(
          { name: 'Detection Threshold', value: `\`${settings.threshold || 5} joins/min\``, inline: true },
          { name: 'Auto-Action', value: `\`${settings.autoAction || 'alert'}\``, inline: true },
          { name: 'Alert Channel', value: settings.alertChannel ? `<#${settings.alertChannel}>` : 'Not set', inline: true },
          { name: 'Log Level', value: `\`${settings.logLevel || 'normal'}\``, inline: true },
          { name: 'Enabled', value: settings.enabled !== false ? 'Yes' : 'No', inline: true },
          { name: 'Last Modified', value: settings.lastModified ? `<t:${Math.floor(new Date(settings.lastModified).getTime() / 1000)}:R>` : 'Never', inline: true }
        )
        .setFooter({ text: `Requested by ${user.tag}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'set') {
      const setting = isSlash
        ? interaction.options.getString('setting')
        : (args[1] || 'threshold');
      const value = isSlash
        ? interaction.options.getString('value')
        : (args[2] || '');

      if (!value) {
        return interaction.reply({ content: 'Please provide a value for the setting.', ephemeral: true });
      }

      await securityEngine.setRaidSetting(interaction.guild.id, setting, value, user.id);

      const embed = new EmbedBuilder()
        .setTitle('Setting Updated')
        .setDescription(`Anti-raid setting has been updated.`)
        .setColor(0x00ff00)
        .addFields(
          { name: 'Setting', value: `\`${setting}\``, inline: true },
          { name: 'New Value', value: `\`${value}\``, inline: true },
          { name: 'Changed By', value: `<@${user.id}>`, inline: true }
        )
        .setFooter({ text: `Requested by ${user.tag}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'reset') {
      await securityEngine.resetRaidSettings(interaction.guild.id, user.id);

      const embed = new EmbedBuilder()
        .setTitle('Settings Reset')
        .setDescription(`All anti-raid settings for **${interaction.guild.name}** have been reset to defaults.`)
        .setColor(0xffff00)
        .addFields(
          { name: 'Reset By', value: `<@${user.id}>`, inline: true },
          { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: `Requested by ${user.tag}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    return interaction.reply({ content: 'Invalid subcommand. Use `view`, `set`, or `reset`.', ephemeral: true });
  }
};
