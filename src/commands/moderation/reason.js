const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reason')
    .setDescription('Update the reason for a mod case')
    .addIntegerOption(option => option.setName('case').setDescription('The case number').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The new reason').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  aliases: ['setreason'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const caseNumber = isSlash ? interaction.options?.getInteger('case') : parseInt(args?.[0]);
    const newReason = isSlash ? interaction.options?.getString('reason') : args?.slice(1).join(' ');

    if (!caseNumber) return interaction.reply({ embeds: [errorEmbed('Please provide a valid case number.')] });
    if (!newReason) return interaction.reply({ embeds: [errorEmbed('Please provide a new reason.')] });

    try {
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: 'update',
        moderator_id: member.id,
        action: 'reason_update',
        reason: `Case #${caseNumber} updated: ${newReason}`,
        case_number: caseNumber
      });

      const guildConfig = await getGuild(interaction.guild.id);
      if (guildConfig?.mod_log_channel) {
        const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
        if (logChannel) {
          logChannel.send({
            embeds: [successEmbed(`**Case #${caseNumber}** reason updated by ${member.user.tag}\n**New Reason:** ${newReason}`)]
          });
        }
      }

      return interaction.reply({ embeds: [successEmbed(`Successfully updated case #${caseNumber} reason to: ${newReason}`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while updating the reason.')] });
    }
  }
};
