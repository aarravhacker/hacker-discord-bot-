const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcomeclear')
    .setDescription('Clear all welcome configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 30,
  aliases: ['welcomeclearall'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const db = getDB();
      await db('welcome').where({ guild_id: interaction.guildId }).del();
      await interaction.reply({ embeds: [successEmbed('Config Cleared', 'All welcome configuration has been removed.')] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to clear welcome config.')] });
    }
  }
};
