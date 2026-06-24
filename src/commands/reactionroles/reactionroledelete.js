const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionroledelete')
    .setDescription('Delete a reaction role by ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt => opt.setName('id').setDescription('Reaction role ID').setRequired(true)),
  cooldown: 5,
  aliases: ['rrdelete'],
  prefix: true,
  async execute(interaction, args) {
      const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
      try {
            const db = getDB();
            const id = isSlash ? interaction.options?.getInteger('id') : (args?.[0] ? parseInt(args[0]) : null);
            const rr = await db('reaction_roles').where({ id, guild_id: interaction.guild.id }).first();
            if (!rr) return interaction.reply({ embeds: [errorEmbed('Not Found', 'Reaction role not found.')] });

            await db('reaction_roles').where({ id }).del();
            return interaction.reply({ embeds: [successEmbed('Deleted', `Reaction role #${id} has been deleted.`)] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
