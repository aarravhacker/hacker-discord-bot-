const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSecurityLogs } = require('../../../db/securityRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdownhistory')
    .setDescription('View lockdown action history')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('limit').setDescription('Number of entries to show').setMinValue(1).setMaxValue(25)
    ),
  cooldown: 5,
  aliases: ['ldhistory'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const limit = isSlash ? (interaction.options?.getInteger('limit') || 10) : parseInt(interaction.content.split(' ')[1]) || 10;
      const logs = await getSecurityLogs(guild.id, 'lockdown', Math.min(limit, 25));

      if (logs.length === 0) {
        return interaction.reply({ embeds: [infoEmbed('Lockdown History', 'No lockdown history found.')] });
      }

      const entries = logs.map((log, i) =>
        `**${i + 1}.** ${log.action} by <@${log.user_id}> - <t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>`
      ).join('\n');

      const embed = successEmbed('Lockdown History', entries);

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to fetch lockdown history.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
