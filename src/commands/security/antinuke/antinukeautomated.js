const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukeautomated')
    .setDescription('Configure automated responses')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable automated responses'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable automated responses'))
    .addSubcommand(sub => sub.setName('config').setDescription('Configure automated response settings')
      .addStringOption(opt => opt.setName('action').setDescription('Action to configure').setRequired(true)
        .addChoices(
          { name: 'Auto-Ban Attackers', value: 'autoban' },
          { name: 'Auto-Restore', value: 'autorestore' },
          { name: 'Auto-Notify', value: 'autonotify' },
          { name: 'Auto-Lockdown', value: 'autolockdown' }
        ))
      .addStringOption(opt => opt.setName('value').setDescription('Enable or disable').setRequired(true)
        .addChoices(
          { name: 'Enable', value: 'enable' },
          { name: 'Disable', value: 'disable' }
        ))),

  cooldown: 5,
  aliases: ['anautomated', 'aautomated'],
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

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'config');
    const validSubs = ['enable', 'disable', 'config'];
    if (!validSubs.includes(subcommand)) {
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('⚠️ Invalid Subcommand')
        .setDescription(`Valid subcommands: ${validSubs.join(', ')}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      if (subcommand === 'enable') {
        await securityEngine.setAutomatedResponses(interaction.guild.id, true);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('🤖 Automated Responses Enabled')
          .setDescription('Automated responses are now **active**. The bot will automatically respond to threats.')
          .addFields({ name: 'Enabled By', value: user.tag, inline: true })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'disable') {
        await securityEngine.setAutomatedResponses(interaction.guild.id, false);
        const embed = new EmbedBuilder()
          .setColor(0xff9900)
          .setTitle('🤖 Automated Responses Disabled')
          .setDescription('Automated responses are now **inactive**. Manual intervention required for threats.')
          .addFields({ name: 'Disabled By', value: user.tag, inline: true })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'config') {
        const action = isSlash ? interaction.options.getString('action') : args[1];
        const value = isSlash ? interaction.options.getString('value') : args[2];
        if (!action || !value) {
          const config = await securityEngine.getAutomatedConfig(interaction.guild.id);
          const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('🤖 Automated Response Configuration')
            .setDescription('Current automated response settings.')
            .addFields(
              { name: 'Auto-Ban', value: config?.autoban ? '✅ Enabled' : '❌ Disabled', inline: true },
              { name: 'Auto-Restore', value: config?.autorestore ? '✅ Enabled' : '❌ Disabled', inline: true },
              { name: 'Auto-Notify', value: config?.autonotify ? '✅ Enabled' : '❌ Disabled', inline: true },
              { name: 'Auto-Lockdown', value: config?.autolockdown ? '✅ Enabled' : '❌ Disabled', inline: true }
            )
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        const enabled = value === 'enable';
        await securityEngine.setAutomatedConfig(interaction.guild.id, action, enabled);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('🤖 Automated Config Updated')
          .setDescription(`${action} has been ${enabled ? 'enabled' : 'disabled'}.`)
          .addFields(
            { name: 'Setting', value: action, inline: true },
            { name: 'Status', value: enabled ? 'Enabled' : 'Disabled', inline: true },
            { name: 'Updated By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(`Automated response operation failed: ${error.message}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};
