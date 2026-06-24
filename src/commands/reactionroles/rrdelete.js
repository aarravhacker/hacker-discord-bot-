const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rrdelete')
    .setDescription('Delete a reaction role (short alias)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt => opt.setName('id').setDescription('Reaction role ID').setRequired(true)),
  cooldown: 5,
  aliases: ['reactionroledelete'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const db = getDB();
            const id = isSlash ? interaction.options?.getInteger('id') : (args?.[0] ? parseInt(args[0]) : null);
            const deleted = await db('reaction_roles').where({ id, guild_id: interaction.guild.id }).del();
            if (!deleted) return interaction.reply({ embeds: [errorEmbed('Not Found', 'Reaction role not found.')] });
            return interaction.reply({ embeds: [successEmbed('Deleted', `Reaction role #${id} deleted.`)] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
