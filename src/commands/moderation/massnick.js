const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('massnick')
    .setDescription('Change nicknames for multiple members')
    .addStringOption(option => option.setName('users').setDescription('User mentions or IDs separated by spaces').setRequired(true))
    .addStringOption(option => option.setName('nickname').setDescription('The new nickname').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the nickname change'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
  cooldown: 30,
  aliases: ['mn'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const usersStr = isSlash ? interaction.options?.getString('users') : args?.[0];
    const nickname = isSlash ? interaction.options?.getString('nickname') : args?.[1];
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(2).join(' ') || 'No reason provided');

    if (!usersStr) return interaction.reply({ embeds: [errorEmbed('Please provide user mentions or IDs separated by spaces.')] });
    if (!nickname) return interaction.reply({ embeds: [errorEmbed('Please provide a nickname.')] });

    const userIds = usersStr.split(/\s+/).map(id => id.replace(/[<>@!]/g, ''));
    if (userIds.length > 50) return interaction.reply({ embeds: [errorEmbed('You can only mass nick up to 50 users at a time.')] });

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const userId of userIds) {
      try {
        const target = interaction.guild.members.cache.get(userId);
        if (!target) {
          results.push(`❌ ${userId}: Not found`);
          failCount++;
          continue;
        }

        await target.setNickname(nickname, reason);
        results.push(`✅ ${target.user.tag}: Nickname changed`);
        successCount++;
      } catch (err) {
        results.push(`❌ ${userId}: ${err.message}`);
        failCount++;
      }
    }

    const caseNumber = await getCaseNumber(interaction.guild.id);
    await addModLog({
      guild_id: interaction.guild.id,
      user_id: 'mass',
      moderator_id: member.id,
      action: 'massnick',
      reason: `Changed nicknames to ${nickname} for ${successCount} users: ${reason}`,
      case_number: caseNumber
    });

    const resultStr = results.join('\n');
    return interaction.reply({
      embeds: [successEmbed(`Mass nickname change complete!\n**Success:** ${successCount}\n**Failed:** ${failCount}\n\n${resultStr}`)]
    });
  }
};
