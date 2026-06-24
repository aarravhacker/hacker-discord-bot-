const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');
const { addSecurityLog } = require('../../../db/securityRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidlock')
    .setDescription('Lock all channels during a raid')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Lock reason')
    ),
  cooldown: 10,
  aliases: ['ralock'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const moderator = isSlash ? interaction.user : interaction.author;

    try {
      const reason = isSlash
        ? interaction.options?.getString('reason') || 'Raid lockdown'
        : interaction.content.split(' ').slice(1).join(' ') || 'Raid lockdown';

      let lockedCount = 0;

      for (const [, channel] of guild.channels.cache) {
        if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) {
          try {
            await channel.permissionOverwrites.edit(guild.roles.everyone, {
              SendMessages: false,
              Speak: false
            }, { reason: `Raid lock by ${moderator.tag}` });
            lockedCount++;
          } catch { }
        }
      }

      await addSecurityLog({
        guild_id: guild.id,
        user_id: moderator.id,
        action: 'raid_lock',
        type: 'antiraid',
        details: JSON.stringify({ channelsLocked: lockedCount, reason })
      });

      const embed = successEmbed('Raid Lock', `🔒 Locked **${lockedCount}** channels.\n**Reason:** ${reason}`);

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to lock channels.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
