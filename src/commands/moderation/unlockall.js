const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlockall')
    .setDescription('Unlock all channels')
    .addStringOption(option => option.setName('reason').setDescription('Reason for unlocking all channels'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 30,
  aliases: ['ula'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.join(' ') || 'No reason provided');

    try {
      const channels = interaction.guild.channels.cache.filter(c => c.isTextBased() && c.viewable);
      let successCount = 0;

      for (const [, channel] of channels) {
        try {
          await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: true
          }, reason);
          successCount++;
        } catch (e) {
          console.error(`Failed to unlock ${channel.name}:`, e);
        }
      }

      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: 'unlockall',
        moderator_id: member.id,
        action: 'unlockall',
        reason: `Unlocked ${successCount} channels: ${reason}`,
        case_number: caseNumber
      });

      return interaction.reply({ embeds: [successEmbed(`Successfully unlocked ${successCount} channels.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while unlocking all channels.')] });
    }
  }
};
