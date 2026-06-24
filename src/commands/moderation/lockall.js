const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockall')
    .setDescription('Lock all channels')
    .addStringOption(option => option.setName('reason').setDescription('Reason for locking all channels'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 30,
  aliases: ['la'],
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
            SendMessages: false
          }, reason);
          successCount++;
        } catch (e) {
          console.error(`Failed to lock ${channel.name}:`, e);
        }
      }

      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: 'lockall',
        moderator_id: member.id,
        action: 'lockall',
        reason: `Locked ${successCount} channels: ${reason}`,
        case_number: caseNumber
      });

      return interaction.reply({ embeds: [successEmbed(`Successfully locked ${successCount} channels.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while locking all channels.')] });
    }
  }
};
