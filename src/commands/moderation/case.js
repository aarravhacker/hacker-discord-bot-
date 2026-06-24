const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getModLogs } = require('../../db/modRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('case')
    .setDescription('View a specific mod case')
    .addIntegerOption(option => option.setName('number').setDescription('The case number').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  aliases: ['viewcase'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const caseNumber = isSlash ? interaction.options?.getInteger('number') : parseInt(args?.[0]);

    if (!caseNumber) return interaction.reply({ embeds: [errorEmbed('Please provide a valid case number.')] });

    try {
      const logs = await getModLogs(interaction.guild.id, 1000);
      const modCase = logs.find(l => l.case_number === caseNumber);

      if (!modCase) return interaction.reply({ embeds: [errorEmbed(`Case #${caseNumber} not found.`)] });

      const embed = infoEmbed(`**Case #${modCase.case_number}**`)
        .addField('Action', modCase.action.toUpperCase(), true)
        .addField('User', `<@${modCase.user_id}>`, true)
        .addField('Moderator', `<@${modCase.moderator_id}>`, true)
        .addField('Reason', modCase.reason || 'No reason provided')
        .addField('Timestamp', `<t:${Math.floor(new Date(modCase.created_at).getTime() / 1000)}:R>`, true);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while fetching the case.')] });
    }
  }
};
