const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { addSecurityLog } = require('../../../db/securityRepository');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Lock or unlock the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('action').setDescription('Lock or unlock')
        .addChoices({ name: 'lock', value: 'lock' }, { name: 'unlock', value: 'unlock' })
    )
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Lock reason')
    ),
  cooldown: 5,
  aliases: ['ld', 'serverlock'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const moderator = isSlash ? interaction.user : interaction.author;

    try {
      let action;
      let reason;

      if (isSlash) {
        action = interaction.options?.getString('action') || 'lock';
        reason = interaction.options?.getString('reason') || 'Server lockdown';
      } else {
        const args = interaction.content.split(' ').slice(1);
        action = args[0]?.toLowerCase() || 'lock';
        reason = args.slice(1).join(' ') || 'Server lockdown';
      }

      if (!['lock', 'unlock'].includes(action)) {
        return interaction.reply({ embeds: [warningEmbed('Warning', 'Usage: lockdown <lock|unlock> [reason]')] });
      }

      let affectedChannels = 0;

      for (const [, channel] of guild.channels.cache) {
        if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) {
          try {
            if (action === 'lock') {
              await channel.permissionOverwrites.edit(guild.roles.everyone, {
                SendMessages: false,
                Speak: false
              }, { reason: `Lockdown by ${moderator.tag}` });
            } else {
              await channel.permissionOverwrites.edit(guild.roles.everyone, {
                SendMessages: null,
                Speak: null
              }, { reason: `Unlock by ${moderator.tag}` });
            }
            affectedChannels++;
          } catch { }
        }
      }

      await updateGuild(guild.id, { lockdown_enabled: action === 'lock' });

      await addSecurityLog({
        guild_id: guild.id,
        user_id: moderator.id,
        action: action === 'lock' ? 'lockdown_activated' : 'lockdown_deactivated',
        type: 'lockdown',
        details: JSON.stringify({ channels: affectedChannels, reason })
      });

      const embed = successEmbed(
        action === 'lock' ? '🔒 Server Locked' : '🔓 Server Unlocked',
        `${action === 'lock' ? 'The server has been **locked**.' : 'The server has been **unlocked**.'}\n` +
        `**Channels affected:** ${affectedChannels}\n` +
        `**Reason:** ${reason}`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to toggle lockdown.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
