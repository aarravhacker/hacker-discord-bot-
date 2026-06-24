const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getModLogs, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('caseedit')
    .setDescription('Edit a mod case')
    .addIntegerOption(option => option.setName('case').setDescription('The case number').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The new reason').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['ce'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const caseNumber = isSlash ? interaction.options?.getInteger('case') : parseInt(args?.[0]);
    const newReason = isSlash ? interaction.options?.getString('reason') : args?.slice(1).join(' ');

    if (!caseNumber) return interaction.reply({ embeds: [errorEmbed('Please provide a valid case number.')] });
    if (!newReason) return interaction.reply({ embeds: [errorEmbed('Please provide a new reason.')] });

    try {
      const logs = await getModLogs(interaction.guild.id, 1000);
      const existingCase = logs.find(l => l.case_number === caseNumber);

      if (!existingCase) return interaction.reply({ embeds: [errorEmbed(`Case #${caseNumber} not found.`)] });

      await addModLog({
        guild_id: interaction.guild.id,
        user_id: existingCase.user_id,
        moderator_id: member.id,
        action: existingCase.action,
        reason: newReason,
        case_number: caseNumber
      });

      const guildConfig = await getGuild(interaction.guild.id);
      if (guildConfig?.mod_log_channel) {
        const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
        if (logChannel) {
          logChannel.send({
            embeds: [successEmbed(`**Case #${caseNumber}** edited by ${member.user.tag}\n**New Reason:** ${newReason}`)]
          });
        }
      }

      return interaction.reply({ embeds: [successEmbed(`Successfully edited case #${caseNumber}.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while editing the case.')] });
    }
  }
};
