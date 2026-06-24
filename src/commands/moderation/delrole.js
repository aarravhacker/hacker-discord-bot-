const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delrole')
    .setDescription('Delete a role')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role to delete')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  cooldown: 5,
  aliases: ['deleterole', 'removerole'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const guild = interaction.guild;
      const role = interaction.options.getRole('role');

      if (!role) {
        return interaction.reply({
          embeds: [errorEmbed('Please provide a valid role.')],
          ephemeral: true
        });
      }

      if (role.position >= guild.members.me.roles.highest.position) {
        return interaction.reply({
          embeds: [errorEmbed('I cannot delete a role equal to or higher than my highest role.')],
          ephemeral: true
        });
      }

      const roleName = role.name;
      await role.delete();

      const embed = successEmbed(`Successfully deleted role **${roleName}**.`);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in delrole command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while deleting the role.')],
        ephemeral: true
      });
    }
  }
};
