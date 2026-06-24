const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrolemode')
    .setDescription('Set the mode for a reaction role')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt => opt.setName('id').setDescription('Reaction role ID').setRequired(true))
    .addStringOption(opt => opt.setName('mode').setDescription('The mode').setRequired(true).addChoices(
      { name: 'Toggle', value: 'toggle' },
      { name: 'Unique', value: 'unique' },
      { name: 'Persistent', value: 'persistent' }
    )),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const db = getDB();
            const id = isSlash ? interaction.options?.getInteger('id') : (args?.[0] ? parseInt(args[0]) : null);
            const mode = isSlash ? interaction.options?.getString('mode') : args?.[1];

            const rr = await db('reaction_roles').where({ id, guild_id: interaction.guild.id }).first();
            if (!rr) return interaction.reply({ embeds: [errorEmbed('Not Found', 'Reaction role not found.')] });

            const roles = Array.isArray(rr.roles) ? rr.roles.map(r => ({ ...r, mode })) : [];
            await db('reaction_roles').where({ id }).update({ roles: JSON.stringify(roles) });

            return interaction.reply({ embeds: [successEmbed('Mode Set', `Reaction role #${id} mode set to **${mode}**.`)] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
