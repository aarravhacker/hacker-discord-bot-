const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionroleclear')
    .setDescription('Clear all roles from a reaction role')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt => opt.setName('id').setDescription('Reaction role ID').setRequired(true)),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
      try {
            const db = getDB();
            const id = isSlash ? interaction.options?.getInteger('id') : (args?.[0] ? parseInt(args[0]) : null);
            const updated = await db('reaction_roles').where({ id, guild_id: interaction.guild.id }).update({ roles: JSON.stringify([]) });
            if (!updated) return interaction.reply({ embeds: [errorEmbed('Not Found', 'Reaction role not found.')] });

            return interaction.reply({ embeds: [successEmbed('Cleared', `All roles cleared from reaction role #${id}.`)] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
