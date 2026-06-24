const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin management')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add an admin')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to add as admin')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove an admin')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to remove from admin')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('reset').setDescription('Remove all admins')
    )
    .addSubcommand(sub =>
      sub
        .setName('role')
        .setDescription('Set admin role')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to set as admin')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('show').setDescription('Show all admins')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  cooldown: 5,
  aliases: ['adminlist', 'admins'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const guild = interaction.guild;
      const subcommand = interaction.options.getSubcommand();
      const db = getDB();

      switch (subcommand) {
        case 'add': {
          const user = interaction.options.getUser('user');

          const existing = await db('admins')
            .where({ guild_id: guild.id, user_id: user.id })
            .first();

          if (existing) {
            return interaction.reply({
              embeds: [errorEmbed('This user is already an admin.')],
              ephemeral: true
            });
          }

          await db('admins').insert({
            guild_id: guild.id,
            user_id: user.id,
            role_id: null,
            added_by: interaction.user.id
          });

          const embed = successEmbed(`Successfully added ${user} as an admin.`);
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'remove': {
          const user = interaction.options.getUser('user');

          const existing = await db('admins')
            .where({ guild_id: guild.id, user_id: user.id })
            .first();

          if (!existing) {
            return interaction.reply({
              embeds: [errorEmbed('This user is not an admin.')],
              ephemeral: true
            });
          }

          await db('admins')
            .where({ guild_id: guild.id, user_id: user.id })
            .del();

          const embed = successEmbed(`Successfully removed ${user} from admins.`);
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'reset': {
          await db('admins').where({ guild_id: guild.id }).del();
          const embed = successEmbed('Successfully removed all admins.');
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'role': {
          const role = interaction.options.getRole('role');

          await db('admins')
            .where({ guild_id: guild.id })
            .update({ role_id: role.id });

          const embed = successEmbed(`Successfully set ${role} as the admin role.`);
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'show': {
          const admins = await db('admins').where({ guild_id: guild.id });

          if (admins.length === 0) {
            return interaction.reply({
              embeds: [infoEmbed('No admins found.')],
              ephemeral: true
            });
          }

          const adminList = admins.map(admin => `<@${admin.user_id}>`).join('\n');
          const embed = infoEmbed(`**Admins:**\n${adminList}`);
          await interaction.reply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      console.error('Error in admin command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while managing admins.')],
        ephemeral: true
      });
    }
  }
};
