const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getModLogsByUser } = require('../../db/modRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('casehistory')
    .setDescription('View case history for a user')
    .addUserOption(option => option.setName('user').setDescription('The user to check case history for').setRequired(true))
    .addIntegerOption(option => option.setName('limit').setDescription('Number of cases to show').setMinValue(1).setMaxValue(50))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  aliases: ['ch'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const target = isSlash ? interaction.options?.getMember('user') : interaction.guild.members.cache.get(args?.[0]?.replace(/[<>@!]/g, ''));
    const limit = isSlash ? interaction.options?.getInteger('limit') : (parseInt(args?.[1]) || 10);

    if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user.')] });

    try {
      const logs = await getModLogsByUser(interaction.guild.id, target.id, limit);

      if (logs.length === 0) {
        return interaction.reply({ embeds: [infoEmbed(`No case history found for ${target.user.tag}.`)] });
      }

      const caseList = logs.map(log => {
        return `**#${log.case_number}** ${log.action.toUpperCase()} - ${log.reason} (by <@${log.moderator_id}>)`;
      }).join('\n');

      const embed = infoEmbed(`Case History for ${target.user.tag} (${logs.length} cases):\n\n${caseList}`);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while fetching case history.')] });
    }
  }
};
