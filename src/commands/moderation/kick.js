const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(option => option.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the kick'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  cooldown: 5,
  aliases: ['k'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = interaction.member || interaction.guild.members.cache.get(interaction.author?.id);
    const target = isSlash ? interaction.options?.getMember('user') : interaction.guild.members.cache.get(args?.[0]?.replace(/[<>@!]/g, ''));
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(1).join(' ') || 'No reason provided');

    if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user to kick.')] });
    if (!target.kickable) return interaction.reply({ embeds: [errorEmbed('I cannot kick this user. They may have a higher role than me.')] });
    if (member.roles.highest.position <= target.roles.highest.position && member.id !== interaction.guild.ownerId) {
      return interaction.reply({ embeds: [errorEmbed('You cannot kick someone with an equal or higher role.')] });
    }

    try {
      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: target.id,
        moderator_id: member.id,
        action: 'kick',
        reason,
        case_number: caseNumber
      });

      await target.send({ embeds: [errorEmbed(`You have been kicked from **${interaction.guild.name}** for: ${reason}`)] }).catch(() => {});
      await target.kick(reason);

      const guildConfig = await getGuild(interaction.guild.id);
      if (guildConfig?.mod_log_channel) {
        const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
        if (logChannel) {
          logChannel.send({
            embeds: [successEmbed(`**Kicked** ${target.user.tag} (${target.id})\n**Moderator:** ${member.user.tag}\n**Reason:** ${reason}\n**Case:** #${caseNumber}`)]
          });
        }
      }

      return interaction.reply({ embeds: [successEmbed(`Successfully kicked ${target.user.tag} for: ${reason}`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while trying to kick the user.')] });
    }
  }
};
