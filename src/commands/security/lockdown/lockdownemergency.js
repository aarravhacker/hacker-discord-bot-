const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');
const { addSecurityLog } = require('../../../db/securityRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdownemergency')
    .setDescription('Emergency lockdown - locks everything immediately')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Emergency reason')
    ),
  cooldown: 60,
  aliases: ['ldemergency', 'emerglock'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const moderator = isSlash ? interaction.user : interaction.author;

    try {
      const reason = isSlash
        ? interaction.options?.getString('reason') || 'EMERGENCY LOCKDOWN'
        : interaction.content.split(' ').slice(1).join(' ') || 'EMERGENCY LOCKDOWN';

      let lockedCount = 0;
      let roleCount = 0;

      for (const [, channel] of guild.channels.cache) {
        if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) {
          try {
            await channel.permissionOverwrites.edit(guild.roles.everyone, {
              SendMessages: false,
              Speak: false,
              ViewChannel: false
            }, { reason: `EMERGENCY by ${moderator.tag}: ${reason}` });
            lockedCount++;
          } catch { }
        }
      }

      for (const [, role] of guild.roles.cache) {
        if (role.id === guild.id) continue;
        if (role.permissions.any(['Administrator', 'ManageGuild', 'ManageChannels', 'ManageRoles'])) {
          try {
            await role.setPermissions(0n, { reason: `EMERGENCY by ${moderator.tag}: ${reason}` });
            roleCount++;
          } catch { }
        }
      }

      await addSecurityLog({
        guild_id: guild.id,
        user_id: moderator.id,
        action: 'emergency_lockdown',
        type: 'lockdown',
        details: JSON.stringify({ channelsLocked: lockedCount, rolesRevoked: roleCount, reason })
      });

      const embed = successEmbed(
        '🚨 EMERGENCY LOCKDOWN ACTIVATED',
        `**Channels locked:** ${lockedCount}\n` +
        `**Admin roles revoked:** ${roleCount}\n` +
        `**Reason:** ${reason}\n\n` +
        'To undo this, use `/lockdown unlock`.'
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to activate emergency lockdown.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
