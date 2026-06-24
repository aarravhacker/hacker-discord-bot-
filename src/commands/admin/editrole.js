const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('editrole')
    .setDescription('Edit a role')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt => opt.setName('role').setDescription('Role to edit').setRequired(true))
    .addStringOption(opt => opt.setName('name').setDescription('New name'))
    .addStringOption(opt => opt.setName('color').setDescription('New color (hex)'))
    .addBooleanOption(opt => opt.setName('hoist').setDescription('Show separately'))
    .addBooleanOption(opt => opt.setName('mentionable').setDescription('Allow mentioning')),
  cooldown: 3,
  aliases: ['updaterole', 'roleedit'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const role = interaction.options?.getRole('role') || interaction.guild.roles.cache.get(args?.[0]?.replace(/[<@&>]/g, ''));
    if (!role) return interaction.reply({ embeds: [errorEmbed('Please provide a valid role.')] });

    const changes = [];
    const updateData = {};

    const name = interaction.options?.getString('name');
    const color = interaction.options?.getString('color');
    const hoist = interaction.options?.getBoolean('hoist');
    const mentionable = interaction.options?.getBoolean('mentionable');

    if (name) { updateData.name = name; changes.push(`Name: **${name}**`); }
    if (color) { updateData.color = color; changes.push(`Color: **${color}**`); }
    if (hoist !== null) { updateData.hoist = hoist; changes.push(`Hoist: **${hoist}**`); }
    if (mentionable !== null) { updateData.mentionable = mentionable; changes.push(`Mentionable: **${mentionable}**`); }

    if (changes.length === 0) return interaction.reply({ embeds: [errorEmbed('Provide at least one field to edit.')] });

    try {
      await role.edit(updateData);
      await interaction.reply({ embeds: [successEmbed(`Updated ${role}: ${changes.join(', ')}`)] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to edit role: ${err.message}`)] });
    }
  }
};
