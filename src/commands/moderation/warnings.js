const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getModLogsByUser } = require('../../db/modRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a member')
    .addUserOption(option => option.setName('user').setDescription('The user to check warnings for').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  aliases: ['warns'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const target = isSlash ? interaction.options?.getMember('user') : interaction.guild.members.cache.get(args?.[0]?.replace(/[<>@!]/g, ''));

    if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user.')] });

    try {
      const warnings = await getModLogsByUser(interaction.guild.id, target.id, 50);
      const warnLogs = warnings.filter(w => w.action === 'warn');

      if (warnLogs.length === 0) {
        return interaction.reply({ embeds: [infoEmbed(`${target.user.tag} has no warnings.`)] });
      }

      const warnList = warnLogs.map((w, i) => `**#${w.case_number}** - ${w.reason} (by <@${w.moderator_id}>)`).join('\n');
      const embed = infoEmbed(`Warnings for ${target.user.tag} (${warnLogs.length} total):\n\n${warnList}`);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while fetching warnings.')] });
    }
  }
};
