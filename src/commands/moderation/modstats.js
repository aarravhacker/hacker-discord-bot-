const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modstats')
    .setDescription('Show moderation statistics')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  cooldown: 5,
  aliases: ['moderationstats', 'modlogstats'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const guild = interaction.guild;
      const db = getDB();

      const stats = await db('modlogs')
        .where({ guild_id: guild.id })
        .select('action')
        .count('* as count')
        .groupBy('action');

      if (stats.length === 0) {
        return interaction.reply({
          embeds: [infoEmbed('No moderation statistics found.')],
          ephemeral: true
        });
      }

      const statsList = stats.map(
        stat => `**${stat.action.charAt(0).toUpperCase() + stat.action.slice(1)}:** ${stat.count}`
      ).join('\n');

      const totalLogs = stats.reduce((sum, stat) => sum + stat.count, 0);

      const embed = infoEmbed(
        `**Moderation Statistics:**\n${statsList}\n\n**Total Actions:** ${totalLogs}`
      );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in modstats command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while fetching statistics.')],
        ephemeral: true
      });
    }
  }
};
