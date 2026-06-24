const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('insiderguard')
    .setDescription('Enable or disable insider guard mode')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('enable').setDescription('Enable insider guard mode')
    )
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Disable insider guard mode')
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Check insider guard status')
    ),
  cooldown: 5,
  aliases: ['iguard', 'insiderguard'],
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

      if (!global.insiderGuard) global.insiderGuard = {};
      const guardState = global.insiderGuard[guild.id] || { enabled: false, activatedAt: null, activatedBy: null, blockedActions: 0 };

      if (subcommand === 'enable') {
        guardState.enabled = true;
        guardState.activatedAt = Date.now();
        guardState.activatedBy = user.tag;
        guardState.blockedActions = 0;
        global.insiderGuard[guild.id] = guardState;

        securityEngine.logIncident(guild.id, user.id, 'insider_guard_enabled', {
          activatedBy: user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle('🛡️ Insider Guard Enabled')
          .setDescription('Insider guard mode is now **active**. All staff actions are being closely monitored.')
          .setColor(0x00ff00)
          .addFields(
            { name: 'Activated By', value: `${user.tag}`, inline: true },
            { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
          )
          .addFields({
            name: 'What This Does',
            value: '• Enhanced monitoring of all staff actions\n• Immediate alerts on suspicious behavior\n• Automatic risk score adjustments\n• Priority incident logging',
            inline: false
          })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'disable') {
        if (!guardState.enabled) {
          const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription('Insider guard mode is already disabled.');
          return interaction.reply({ embeds: [embed] });
        }

        guardState.enabled = false;
        guardState.deactivatedAt = Date.now();
        global.insiderGuard[guild.id] = guardState;

        securityEngine.logIncident(guild.id, user.id, 'insider_guard_disabled', {
          deactivatedBy: user.tag,
          blockedActions: guardState.blockedActions
        });

        const embed = new EmbedBuilder()
          .setTitle('🛡️ Insider Guard Disabled')
          .setDescription('Insider guard mode has been **deactivated**.')
          .setColor(0xff6600)
          .addFields(
            { name: 'Deactivated By', value: `${user.tag}`, inline: true },
            { name: 'Blocked Actions', value: `**${guardState.blockedActions}**`, inline: true },
            { name: 'Duration', value: guardState.activatedAt ? `<t:${Math.floor(guardState.activatedAt / 1000)}:R> to now` : 'Unknown', inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'status') {
        let color = 0x00ff00;
        let statusText = 'Inactive';
        if (guardState.enabled) {
          color = 0xff6600;
          statusText = 'Active';
        }

        const embed = new EmbedBuilder()
          .setTitle('🛡️ Insider Guard Status')
          .setColor(color)
          .addFields(
            { name: 'Status', value: `**${statusText}**`, inline: true },
            { name: 'Blocked Actions', value: `**${guardState.blockedActions}**`, inline: true },
            { name: 'Activated By', value: guardState.activatedBy || 'N/A', inline: true },
            { name: 'Activated At', value: guardState.activatedAt ? `<t:${Math.floor(guardState.activatedAt / 1000)}:R>` : 'N/A', inline: true }
          )
          .setTimestamp();

        if (guardState.enabled) {
          embed.addFields({
            name: 'Active Protections',
            value: '• Real-time staff action monitoring\n• Anomaly detection boost\n• Priority alert routing\n• Enhanced logging',
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
        .setDescription('An error occurred while toggling insider guard.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
