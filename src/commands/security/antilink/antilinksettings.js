const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilinksettings')
    .setDescription('Link protection settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View current link settings')
    )
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set link settings')
        .addStringOption(opt =>
          opt.setName('setting')
            .setDescription('Setting to change')
            .setRequired(true)
            .addChoices(
              { name: 'Filter Mode', value: 'mode' },
              { name: 'Auto-Delete', value: 'autoDelete' },
              { name: 'Alert Channel', value: 'alertChannel' },
              { name: 'Whitelist', value: 'whitelist' }
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
        .setDescription('Reset all link settings to defaults')
    ),
  cooldown: 5,
  aliases: ['alsettings'],
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
      const settings = await securityEngine.getLinkSettings(interaction.guild.id);
      const embed = new EmbedBuilder()
        .setTitle('Link Protection Settings')
        .setDescription(`Current settings for **${interaction.guild.name}**`)
        .setColor(0x0099ff)
        .addFields(
          { name: 'Filter Mode', value: `\`${settings.mode || 'moderate'}\``, inline: true },
          { name: 'Auto-Delete', value: settings.autoDelete ? 'Yes' : 'No', inline: true },
          { name: 'Alert Channel', value: settings.alertChannel ? `<#${settings.alertChannel}>` : 'Not set', inline: true },
          { name: 'Whitelist', value: settings.whitelist ? `\`${settings.whitelist.length} domains\`` : 'None', inline: true },
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
        : (args[1] || 'mode');
      const value = isSlash
        ? interaction.options.getString('value')
        : (args[2] || '');

      if (!value) {
        return interaction.reply({ content: 'Please provide a value for the setting.', ephemeral: true });
      }

      await securityEngine.setLinkSetting(interaction.guild.id, setting, value, user.id);

      const embed = new EmbedBuilder()
        .setTitle('Setting Updated')
        .setDescription(`Link protection setting has been updated.`)
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
      await securityEngine.resetLinkSettings(interaction.guild.id, user.id);

      const embed = new EmbedBuilder()
        .setTitle('Settings Reset')
        .setDescription(`All link protection settings for **${interaction.guild.name}** have been reset to defaults.`)
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
