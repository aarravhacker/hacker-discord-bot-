const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Softban a member (ban and unban to clear messages)')
    .addUserOption(option => option.setName('user').setDescription('The user to softban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the softban'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 5,
  aliases: ['sb'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const target = isSlash ? interaction.options?.getMember('user') : interaction.guild.members.cache.get(args?.[0]?.replace(/[<>@!]/g, ''));
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(1).join(' ') || 'No reason provided');

    if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user to softban.')] });
    if (!target.bannable) return interaction.reply({ embeds: [errorEmbed('I cannot softban this user.')] });

    try {
      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: target.id,
        moderator_id: member.id,
        action: 'softban',
        reason,
        case_number: caseNumber
      });

      await target.send({ embeds: [errorEmbed(`You have been softbanned from **${interaction.guild.name}** for: ${reason}`)] }).catch(() => {});
      await target.ban({ deleteMessageDays: 7, reason });
      await interaction.guild.members.unban(target.id, 'Softban - messages cleared');

      const guildConfig = await getGuild(interaction.guild.id);
      if (guildConfig?.mod_log_channel) {
        const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
        if (logChannel) {
          logChannel.send({
            embeds: [successEmbed(`**Softbanned** ${target.user.tag} (${target.id})\n**Moderator:** ${member.user.tag}\n**Reason:** ${reason}\n**Case:** #${caseNumber}`)]
          });
        }
      }

      return interaction.reply({ embeds: [successEmbed(`Successfully softbanned ${target.user.tag} for: ${reason}`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while trying to softban the user.')] });
    }
  }
};
