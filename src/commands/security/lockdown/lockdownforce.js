const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');
const { addSecurityLog } = require('../../../db/securityRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdownforce')
    .setDescription('Force lockdown bypass for a specific channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel to force unlock').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason')
    ),
  cooldown: 10,
  aliases: ['ldforce'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const moderator = isSlash ? interaction.user : interaction.author;

    try {
      let channelId;
      let reason;

      if (isSlash) {
        channelId = interaction.options?.getChannel('channel').id;
        reason = interaction.options?.getString('reason') || 'Force unlock';
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (!args[0]) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Usage: lockdownforce <channel> [reason]')] });
        }
        channelId = args[0].replace(/[<#>]/g, '');
        reason = args.slice(1).join(' ') || 'Force unlock';
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        return interaction.reply({ embeds: [errorEmbed('Error', 'Channel not found.')] });
      }

      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: true,
        Speak: true,
        ViewChannel: true
      }, { reason: `Force unlock by ${moderator.tag}: ${reason}` });

      await addSecurityLog({
        guild_id: guild.id,
        user_id: moderator.id,
        action: 'lockdown_force_unlock',
        type: 'lockdown',
        details: JSON.stringify({ channel: channelId, reason })
      });

      const embed = successEmbed(
        '🔓 Channel Force Unlocked',
        `Channel <#${channelId}> has been force unlocked.\n**Reason:** ${reason}`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to force unlock channel.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
