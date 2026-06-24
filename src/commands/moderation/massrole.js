const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('massrole')
    .setDescription('Add a role to multiple members')
    .addStringOption(option => option.setName('users').setDescription('User mentions or IDs separated by spaces').setRequired(true))
    .addRoleOption(option => option.setName('role').setDescription('The role to add').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for adding the role'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  cooldown: 30,
  aliases: ['mar'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const usersStr = isSlash ? interaction.options?.getString('users') : args?.[0];
    const role = isSlash ? interaction.options?.getRole('role') : interaction.guild.roles.cache.get(args?.[1]?.replace(/[<>@&]/g, ''));
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(2).join(' ') || 'No reason provided');

    if (!usersStr) return interaction.reply({ embeds: [errorEmbed('Please provide user mentions or IDs separated by spaces.')] });
    if (!role) return interaction.reply({ embeds: [errorEmbed('Please provide a valid role.')] });
    if (role.position >= member.roles.highest.position && member.id !== interaction.guild.ownerId) {
      return interaction.reply({ embeds: [errorEmbed('You cannot assign a role equal to or higher than your highest role.')] });
    }

    const userIds = usersStr.split(/\s+/).map(id => id.replace(/[<>@!]/g, ''));
    if (userIds.length > 50) return interaction.reply({ embeds: [errorEmbed('You can only mass role up to 50 users at a time.')] });

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

        if (target.roles.cache.has(role.id)) {
          results.push(`❌ ${userId}: Already has role`);
          failCount++;
          continue;
        }

        await target.roles.add(role, reason);
        results.push(`✅ ${target.user.tag}: Role added`);
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
      action: 'massrole',
      reason: `Added role ${role.name} to ${successCount} users: ${reason}`,
      case_number: caseNumber
    });

    const resultStr = results.join('\n');
    return interaction.reply({
      embeds: [successEmbed(`Mass role complete!\n**Success:** ${successCount}\n**Failed:** ${failCount}\n\n${resultStr}`)]
    });
  }
};
