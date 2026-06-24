const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');
const { addSecurityLog } = require('../../../db/securityRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdownchannel')
    .setDescription('Lock or unlock a specific channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel to lock/unlock').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('action').setDescription('Lock or unlock')
        .addChoices({ name: 'lock', value: 'lock' }, { name: 'unlock', value: 'unlock' })
    )
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason')
    ),
  cooldown: 5,
  aliases: ['ldchannel'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const moderator = isSlash ? interaction.user : interaction.author;

    try {
      let channelId;
      let action;
      let reason;

      if (isSlash) {
        channelId = interaction.options?.getChannel('channel').id;
        action = interaction.options?.getString('action') || 'lock';
        reason = interaction.options?.getString('reason') || 'Channel lockdown';
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (args.length < 2) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Usage: lockdownchannel <channel> <lock|unlock> [reason]')] });
        }
        channelId = args[0].replace(/[<#>]/g, '');
        action = args[1].toLowerCase();
        reason = args.slice(2).join(' ') || 'Channel lockdown';
      }

      if (!['lock', 'unlock'].includes(action)) {
        return interaction.reply({ embeds: [warningEmbed('Warning', 'Action must be lock or unlock.')] });
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        return interaction.reply({ embeds: [errorEmbed('Error', 'Channel not found.')] });
      }

      if (action === 'lock') {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: false
        }, { reason: `Lockdown by ${moderator.tag}` });
      } else {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: null
        }, { reason: `Unlock by ${moderator.tag}` });
      }

      await addSecurityLog({
        guild_id: guild.id,
        user_id: moderator.id,
        action: action === 'lock' ? 'channel_locked' : 'channel_unlocked',
        type: 'lockdown',
        details: JSON.stringify({ channel: channelId, reason })
      });

      const embed = successEmbed(
        action === 'lock' ? '🔒 Channel Locked' : '🔓 Channel Unlocked',
        `${action === 'lock' ? 'Channel' : 'Channel'} <#${channelId}> has been ${action === 'lock' ? 'locked' : 'unlocked'}.\n**Reason:** ${reason}`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to lock/unlock channel.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
