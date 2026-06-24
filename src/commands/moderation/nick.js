const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nick')
    .setDescription('Change a member\'s nickname')
    .addUserOption(option => option.setName('user').setDescription('The user to change nickname for').setRequired(true))
    .addStringOption(option => option.setName('nickname').setDescription('The new nickname').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the nickname change'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
  cooldown: 5,
  aliases: ['nickname'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const target = isSlash ? interaction.options?.getMember('user') : interaction.guild.members.cache.get(args?.[0]?.replace(/[<>@!]/g, ''));
    const nickname = isSlash ? interaction.options?.getString('nickname') : args?.[1];
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(2).join(' ') || 'No reason provided');

    if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user.')] });
    if (!nickname) return interaction.reply({ embeds: [errorEmbed('Please provide a nickname.')] });

    try {
      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: target.id,
        moderator_id: member.id,
        action: 'nick',
        reason: `Changed nickname to ${nickname}: ${reason}`,
        case_number: caseNumber
      });

      await target.setNickname(nickname, reason);

      return interaction.reply({ embeds: [successEmbed(`Successfully changed ${target.user.tag}'s nickname to **${nickname}**.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while changing the nickname.')] });
    }
  }
};
