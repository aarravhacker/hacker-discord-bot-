const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server')
    .addStringOption(option => option.setName('userid').setDescription('The user ID to unban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the unban'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 5,
  aliases: ['ub'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const userId = isSlash ? interaction.options?.getString('userid') : args?.[0]?.replace(/[<>@!]/g, '');
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(1).join(' ') || 'No reason provided');

    if (!userId) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user ID to unban.')] });

    try {
      const banList = await interaction.guild.bans.fetch();
      const bannedUser = banList.get(userId);
      if (!bannedUser) return interaction.reply({ embeds: [errorEmbed('This user is not banned.')] });

      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: userId,
        moderator_id: member.id,
        action: 'unban',
        reason,
        case_number: caseNumber
      });

      await interaction.guild.members.unban(userId, reason);

      const guildConfig = await getGuild(interaction.guild.id);
      if (guildConfig?.mod_log_channel) {
        const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
        if (logChannel) {
          logChannel.send({
            embeds: [successEmbed(`**Unbanned** ${bannedUser.user.tag} (${userId})\n**Moderator:** ${member.user.tag}\n**Reason:** ${reason}\n**Case:** #${caseNumber}`)]
          });
        }
      }

      return interaction.reply({ embeds: [successEmbed(`Successfully unbanned ${bannedUser.user.tag} for: ${reason}`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while trying to unban the user.')] });
    }
  }
};
