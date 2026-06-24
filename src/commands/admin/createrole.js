const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('createrole')
    .setDescription('Create a new role')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName('name').setDescription('Role name').setRequired(true))
    .addStringOption(opt => opt.setName('color').setDescription('Role color (hex, e.g. #ff0000)'))
    .addBooleanOption(opt => opt.setName('hoist').setDescription('Show separately in member list'))
    .addBooleanOption(opt => opt.setName('mentionable').setDescription('Allow mentioning this role')),
  cooldown: 3,
  aliases: ['addrole', 'newrole'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    const name = interaction.options?.getString('name') || args?.[0];
    if (!name) return interaction.reply({ embeds: [errorEmbed('Please provide a role name.')] });

    const color = interaction.options?.getString('color') || args?.[1];
    const hoist = interaction.options?.getBoolean('hoist') ?? args?.[2] === 'true';
    const mentionable = interaction.options?.getBoolean('mentionable') ?? args?.[3] === 'true';

    try {
      const role = await interaction.guild.roles.create({
        name,
        color: color || undefined,
        hoist,
        mentionable,
        reason: `Created by ${user.tag}`
      });
      await interaction.reply({
        embeds: [successEmbed(`Created role ${role} (${role.id})`)]
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to create role: ${err.message}`)] });
    }
  }
};
