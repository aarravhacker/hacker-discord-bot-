const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getModLogs } = require('../../db/modRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('View recent moderation history')
    .addIntegerOption(option => option.setName('limit').setDescription('Number of entries to show (1-50)').setMinValue(1).setMaxValue(50))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  aliases: ['modhistory', 'mh'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const limit = isSlash ? interaction.options?.getInteger('limit') : (parseInt(args?.[0]) || 10);

    try {
      const logs = await getModLogs(interaction.guild.id, limit);

      if (logs.length === 0) {
        return interaction.reply({ embeds: [infoEmbed('No moderation history found.')] });
      }

      const historyList = logs.map(log => {
        const action = log.action.toUpperCase();
        return `**#${log.case_number}** ${action} - <@${log.user_id}> by <@${log.moderator_id}> - ${log.reason}`;
      }).join('\n');

      const embed = infoEmbed(`Moderation History (Last ${logs.length} entries):\n\n${historyList}`);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while fetching history.')] });
    }
  }
};
