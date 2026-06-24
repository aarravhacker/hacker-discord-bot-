const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionroletest')
    .setDescription('Test a reaction role by adding all roles to yourself')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt => opt.setName('id').setDescription('Reaction role ID').setRequired(true)),
  cooldown: 10,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const db = getDB();
    const id = isSlash ? interaction.options?.getInteger('id') : (args?.[0] ? parseInt(args[0]) : null);
    const rr = await db('reaction_roles').where({ id, guild_id: interaction.guild.id }).first();
    if (!rr) return interaction.reply({ embeds: [errorEmbed('Not Found', 'Reaction role not found.')] });

    const roles = Array.isArray(rr.roles) ? rr.roles : [];
    if (!roles.length) return interaction.reply({ embeds: [errorEmbed('No Roles', 'This reaction role has no roles configured.')] });

    let added = 0;
    for (const r of roles) {
      try {
        await interaction.member.roles.add(r.roleId);
        added++;
      } catch (e) {}
    }

    return interaction.reply({ embeds: [successEmbed('Test Complete', `Added **${added}** of **${roles.length}** roles to yourself.`)] });
  }
};
