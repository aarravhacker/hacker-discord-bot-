const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deletepoll')
    .setDescription('Delete a poll from database')
    .addStringOption(opt => opt.setName('messageid').setDescription('Poll message ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 5,
  aliases: ['removepoll'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const messageId = interaction.options?.getString('messageid') || args[0];
      if (!messageId) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /deletepoll <messageId>')] });
      }

      const db = getDB();
      const deleted = await db('polls').where({ message_id: messageId, guild_id: interaction.guild.id }).del();

      if (deleted === 0) {
        return interaction.reply({ embeds: [errorEmbed('Poll not found!')] });
      }

      await interaction.reply({ embeds: [successEmbed('Poll deleted from database.')] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to delete poll.')] });
    }
  }
};
