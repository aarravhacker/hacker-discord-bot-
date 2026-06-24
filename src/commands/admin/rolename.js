const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolename')
    .setDescription('Rename a role')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
    .addStringOption(opt => opt.setName('name').setDescription('New name').setRequired(true)),
  cooldown: 3,
  aliases: ['renamerole', 'setrolename'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    const role = interaction.options?.getRole('role') || interaction.guild.roles.cache.get(args?.[0]?.replace(/[<@&>]/g, ''));
    if (!role) return interaction.reply({ embeds: [errorEmbed('Please provide a valid role.')] });

    const name = interaction.options?.getString('name') || args?.[1];
    if (!name) return interaction.reply({ embeds: [errorEmbed('Please provide a new name.')] });

    try {
      const oldName = role.name;
      await role.setName(name, `Renamed by ${user.tag}`);
      await interaction.reply({ embeds: [successEmbed(`Renamed role **${oldName}** to **${name}**`)] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to rename role: ${err.message}`)] });
    }
  }
};
