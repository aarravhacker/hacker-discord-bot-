const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getModLogs } = require('../../db/modRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlogs')
    .setDescription('View mod logs')
    .addIntegerOption(option => option.setName('limit').setDescription('Number of logs to show (1-50)').setMinValue(1).setMaxValue(50))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  aliases: ['logs', 'ml'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const limit = isSlash ? interaction.options?.getInteger('limit') : (parseInt(args?.[0]) || 10);

    try {
      const logs = await getModLogs(interaction.guild.id, limit);

      if (logs.length === 0) {
        return interaction.reply({ embeds: [infoEmbed('No mod logs found.')] });
      }

      const logList = logs.map(log => {
        return `**#${log.case_number}** ${log.action.toUpperCase()} - <@${log.user_id}> by <@${log.moderator_id}>`;
      }).join('\n');

      const embed = infoEmbed(`Mod Logs (Last ${logs.length}):\n\n${logList}`);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while fetching mod logs.')] });
    }
  }
};
