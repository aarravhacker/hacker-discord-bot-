const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getModLogs, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('casedelete')
    .setDescription('Delete a mod case')
    .addIntegerOption(option => option.setName('case').setDescription('The case number').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['cd'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const caseNumber = isSlash ? interaction.options?.getInteger('case') : parseInt(args?.[0]);

    if (!caseNumber) return interaction.reply({ embeds: [errorEmbed('Please provide a valid case number.')] });

    try {
      const logs = await getModLogs(interaction.guild.id, 1000);
      const existingCase = logs.find(l => l.case_number === caseNumber);

      if (!existingCase) return interaction.reply({ embeds: [errorEmbed(`Case #${caseNumber} not found.`)] });

      await addModLog({
        guild_id: interaction.guild.id,
        user_id: existingCase.user_id,
        moderator_id: member.id,
        action: 'case_delete',
        reason: `Deleted case #${caseNumber}`,
        case_number: caseNumber
      });

      const guildConfig = await getGuild(interaction.guild.id);
      if (guildConfig?.mod_log_channel) {
        const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
        if (logChannel) {
          logChannel.send({
            embeds: [successEmbed(`**Case #${caseNumber}** deleted by ${member.user.tag}`)]
          });
        }
      }

      return interaction.reply({ embeds: [successEmbed(`Successfully deleted case #${caseNumber}.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while deleting the case.')] });
    }
  }
};
