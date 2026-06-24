const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getModLogs } = require('../../db/modRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnlist')
    .setDescription('List all warnings in the server')
    .addIntegerOption(option => option.setName('limit').setDescription('Number of warnings to show (1-50)').setMinValue(1).setMaxValue(50))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  aliases: ['wl'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const limit = isSlash ? interaction.options?.getInteger('limit') : (parseInt(args?.[0]) || 10);

    try {
      const logs = await getModLogs(interaction.guild.id, 1000);
      const warnings = logs.filter(l => l.action === 'warn').slice(0, limit);

      if (warnings.length === 0) {
        return interaction.reply({ embeds: [infoEmbed('No warnings found in this server.')] });
      }

      const warnList = warnings.map(w => {
        return `**#${w.case_number}** <@${w.user_id}> - ${w.reason} (by <@${w.moderator_id}>)`;
      }).join('\n');

      const embed = infoEmbed(`Server Warnings (${warnings.length} shown):\n\n${warnList}`);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while fetching warnings.')] });
    }
  }
};
