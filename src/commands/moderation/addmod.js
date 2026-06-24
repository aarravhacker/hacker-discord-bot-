const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addmod')
    .setDescription('Add a moderator role')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role to add as moderator')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('level')
        .setDescription('Moderation level')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  cooldown: 5,
  aliases: ['addmoderator', 'setmod'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const guild = interaction.guild;
      const role = interaction.options.getRole('role');
      const level = interaction.options.getInteger('level') || 0;

      if (!role) {
        return interaction.reply({
          embeds: [errorEmbed('Please provide a valid role.')],
          ephemeral: true
        });
      }

      const db = getDB();

      const existing = await db('mod_roles')
        .where({ guild_id: guild.id, role_id: role.id })
        .first();

      if (existing) {
        await db('mod_roles')
          .where({ guild_id: guild.id, role_id: role.id })
          .update({ level });
      } else {
        await db('mod_roles').insert({
          guild_id: guild.id,
          role_id: role.id,
          level,
          added_by: interaction.user.id
        });
      }

      const embed = successEmbed(
        `Successfully added ${role} as a moderator role with level ${level}.`
      );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in addmod command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while adding the moderator role.')],
        ephemeral: true
      });
    }
  }
};
