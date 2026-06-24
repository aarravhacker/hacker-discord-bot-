const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdownconfig')
    .setDescription('Configure lockdown settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('logchannel').setDescription('Channel for lockdown logs')
    )
    .addRoleOption(opt =>
      opt.setName('bypassrole').setDescription('Role that bypasses lockdown')
    )
    .addBooleanOption(opt =>
      opt.setName('autolock').setDescription('Enable auto-lockdown on raid')
    ),
  cooldown: 5,
  aliases: ['ldconfig'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);
      let lockdownConfig = JSON.parse(guildData.lockdown_config || '{}');

      if (isSlash) {
        const logChannel = interaction.options?.getChannel('logchannel');
        const bypassRole = interaction.options?.getRole('bypassrole');
        const autoLock = interaction.options?.getBoolean('autolock');

        if (logChannel) lockdownConfig.logChannel = logChannel.id;
        if (bypassRole) lockdownConfig.bypassRole = bypassRole.id;
        if (autoLock !== null) lockdownConfig.autoLock = autoLock;
      } else {
        const args = interaction.content.split(' ').slice(1);
        const settingsMap = {
          'logchannel': 'logChannel',
          'bypassrole': 'bypassRole',
          'autolock': 'autoLock'
        };
        for (let i = 0; i < args.length - 1; i += 2) {
          const key = args[i].toLowerCase();
          const value = args[i + 1];
          if (settingsMap[key]) {
            if (key === 'autolock') {
              lockdownConfig[settingsMap[key]] = value.toLowerCase() === 'true' || value === '1';
            } else {
              lockdownConfig[settingsMap[key]] = value.replace(/[<@#&>]/g, '');
            }
          }
        }
      }

      lockdownConfig = {
        ...lockdownConfig,
        logChannel: lockdownConfig.logChannel || null,
        bypassRole: lockdownConfig.bypassRole || null,
        autoLock: lockdownConfig.autoLock !== undefined ? lockdownConfig.autoLock : false
      };

      await updateGuild(guild.id, { lockdown_config: JSON.stringify(lockdownConfig) });

      const embed = successEmbed(
        'Lockdown Configuration Updated',
        `**Log Channel:** ${lockdownConfig.logChannel ? `<#${lockdownConfig.logChannel}>` : 'Not set'}\n` +
        `**Bypass Role:** ${lockdownConfig.bypassRole ? `<@&${lockdownConfig.bypassRole}>` : 'Not set'}\n` +
        `**Auto Lock:** ${lockdownConfig.autoLock ? '✅ Enabled' : '❌ Disabled'}`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to update lockdown configuration.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
