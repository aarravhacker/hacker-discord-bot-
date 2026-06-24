const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rrremove')
    .setDescription('Remove an emoji-role pair (short alias)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt => opt.setName('id').setDescription('Reaction role ID').setRequired(true))
    .addStringOption(opt => opt.setName('emoji').setDescription('The emoji to remove').setRequired(true)),
  cooldown: 5,
  aliases: ['reactionroleremove'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const db = getDB();
            const id = isSlash ? interaction.options?.getInteger('id') : (args?.[0] ? parseInt(args[0]) : null);
            const emoji = isSlash ? interaction.options?.getString('emoji') : args?.[1];

            const rr = await db('reaction_roles').where({ id, guild_id: interaction.guild.id }).first();
            if (!rr) return interaction.reply({ embeds: [errorEmbed('Not Found', 'Reaction role not found.')] });

            const roles = Array.isArray(rr.roles) ? [...rr.roles] : [];
            const idx = roles.findIndex(r => r.emoji === emoji);
            if (idx === -1) return interaction.reply({ embeds: [errorEmbed('Not Found', `No role for emoji ${emoji}.`)] });

            roles.splice(idx, 1);
            await db('reaction_roles').where({ id }).update({ roles: JSON.stringify(roles) });

            return interaction.reply({ embeds: [successEmbed('Removed', `Removed ${emoji} from reaction role #${id}.`)] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
