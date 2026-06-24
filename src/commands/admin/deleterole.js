const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deleterole')
    .setDescription('Delete a role')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt => opt.setName('role').setDescription('Role to delete').setRequired(true)),
  cooldown: 5,
  aliases: ['delrole', 'removerole'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    const role = interaction.options?.getRole('role') || interaction.guild.roles.cache.get(args?.[0]?.replace(/[<@&>]/g, ''));
    if (!role) return interaction.reply({ embeds: [errorEmbed('Please provide a valid role.')] });

    if (role.managed) {
      return interaction.reply({ embeds: [errorEmbed('Cannot delete a managed role.')] });
    }
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ embeds: [errorEmbed('Cannot delete a role equal to or higher than my highest role.')] });
    }

    try {
      const name = role.name;
      await role.delete(`Deleted by ${user.tag}`);
      await interaction.reply({ embeds: [successEmbed(`Deleted role **${name}**`)] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to delete role: ${err.message}`)] });
    }
  }
};
