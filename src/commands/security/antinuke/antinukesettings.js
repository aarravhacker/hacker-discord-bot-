const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukesettings')
    .setDescription('Quick antinuke settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('view').setDescription('View current settings'))
    .addSubcommand(sub => sub.setName('set').setDescription('Quick set a setting')
      .addStringOption(opt => opt.setName('setting').setDescription('Setting name').setRequired(true)
        .addChoices(
          { name: 'Auto-Respond', value: 'autorespond' },
          { name: 'Notifications', value: 'notifications' },
          { name: 'Logging', value: 'logging' },
          { name: 'Rollback', value: 'rollback' },
          { name: 'Verbose', value: 'verbose' }
        ))
      .addStringOption(opt => opt.setName('value').setDescription('Setting value').setRequired(true)
        .addChoices(
          { name: 'Enable', value: 'enable' },
          { name: 'Disable', value: 'disable' }
        )))
    .addSubcommand(sub => sub.setName('reset').setDescription('Reset all settings to defaults')),

  cooldown: 5,
  aliases: ['ansettings', 'asettings'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Permission Denied')
        .setDescription('You need Administrator permission to use this command.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'view');
    const validSubs = ['view', 'set', 'reset'];
    if (!validSubs.includes(subcommand)) {
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('⚠️ Invalid Subcommand')
        .setDescription(`Valid subcommands: ${validSubs.join(', ')}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      if (subcommand === 'view') {
        const settings = await securityEngine.getSettings(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('⚙️ Antinuke Settings')
          .setDescription('Current quick settings.')
          .addFields(
            { name: 'Auto-Respond', value: settings?.autorespond ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Notifications', value: settings?.notifications ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Logging', value: settings?.logging ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Rollback', value: settings?.rollback ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Verbose', value: settings?.verbose ? '✅ Enabled' : '❌ Disabled', inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'set') {
        const setting = isSlash ? interaction.options.getString('setting') : args[1];
        const value = isSlash ? interaction.options.getString('value') : args[2];
        if (!setting || !value) {
          const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle('⚠️ Missing Parameters')
            .setDescription('Please provide both setting and value.')
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        const enabled = value === 'enable';
        await securityEngine.setSetting(interaction.guild.id, setting, enabled);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('⚙️ Setting Updated')
          .setDescription(`Setting \`${setting}\` has been ${enabled ? 'enabled' : 'disabled'}.`)
          .addFields(
            { name: 'Setting', value: setting, inline: true },
            { name: 'Value', value: enabled ? 'Enabled' : 'Disabled', inline: true },
            { name: 'Updated By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'reset') {
        await securityEngine.resetSettings(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('⚙️ Settings Reset')
          .setDescription('All settings have been reset to defaults.')
          .addFields({ name: 'Reset By', value: user.tag, inline: true })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(`Settings operation failed: ${error.message}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};
