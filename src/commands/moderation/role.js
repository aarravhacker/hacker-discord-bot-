const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Add a role to a member')
    .addUserOption(option => option.setName('user').setDescription('The user to add the role to').setRequired(true))
    .addRoleOption(option => option.setName('role').setDescription('The role to add').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for adding the role'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  cooldown: 5,
  aliases: ['ar', 'addrole'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const target = isSlash ? interaction.options?.getMember('user') : interaction.guild.members.cache.get(args?.[0]?.replace(/[<>@!]/g, ''));
    const role = isSlash ? interaction.options?.getRole('role') : interaction.guild.roles.cache.get(args?.[1]?.replace(/[<>@&]/g, ''));
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(2).join(' ') || 'No reason provided');

    if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user.')] });
    if (!role) return interaction.reply({ embeds: [errorEmbed('Please provide a valid role.')] });
    if (role.position >= member.roles.highest.position && member.id !== interaction.guild.ownerId) {
      return interaction.reply({ embeds: [errorEmbed('You cannot assign a role equal to or higher than your highest role.')] });
    }

    try {
      if (target.roles.cache.has(role.id)) return interaction.reply({ embeds: [errorEmbed('This user already has this role.')] });

      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: target.id,
        moderator_id: member.id,
        action: 'role',
        reason: `Added role ${role.name}: ${reason}`,
        case_number: caseNumber
      });

      await target.roles.add(role, reason);

      return interaction.reply({ embeds: [successEmbed(`Successfully added ${role} to ${target.user.tag}.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while adding the role.')] });
    }
  }
};
