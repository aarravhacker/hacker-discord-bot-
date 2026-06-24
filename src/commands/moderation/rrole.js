const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rrole')
    .setDescription('Remove roles from users')
    .addSubcommand(sub =>
      sub
        .setName('all')
        .setDescription('Remove role from all members')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('bots')
        .setDescription('Remove role from all bots')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('cancel').setDescription('Cancel role removal')
    )
    .addSubcommand(sub =>
      sub
        .setName('humans')
        .setDescription('Remove role from all humans')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Show role removal status')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  cooldown: 5,
  aliases: ['removerole', 'bulkremoverole'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const guild = interaction.guild;
      const subcommand = interaction.options.getSubcommand();
      const db = getDB();

      switch (subcommand) {
        case 'all': {
          const role = interaction.options.getRole('role');

          const members = await guild.members.fetch();
          let removedCount = 0;

          for (const [, member] of members) {
            if (member.roles.cache.has(role.id)) {
              try {
                await member.roles.remove(role);
                removedCount++;
              } catch (error) {
                console.error(`Failed to remove role from ${member.user.tag}:`, error);
              }
            }
          }

          const embed = successEmbed(
            `Successfully removed ${role} from ${removedCount} members.`
          );
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'bots': {
          const role = interaction.options.getRole('role');

          const members = await guild.members.fetch();
          let removedCount = 0;

          for (const [, member] of members) {
            if (member.user.bot && member.roles.cache.has(role.id)) {
              try {
                await member.roles.remove(role);
                removedCount++;
              } catch (error) {
                console.error(`Failed to remove role from ${member.user.tag}:`, error);
              }
            }
          }

          const embed = successEmbed(
            `Successfully removed ${role} from ${removedCount} bots.`
          );
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'cancel': {
          const embed = successEmbed('Role removal cancelled.');
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'humans': {
          const role = interaction.options.getRole('role');

          const members = await guild.members.fetch();
          let removedCount = 0;

          for (const [, member] of members) {
            if (!member.user.bot && member.roles.cache.has(role.id)) {
              try {
                await member.roles.remove(role);
                removedCount++;
              } catch (error) {
                console.error(`Failed to remove role from ${member.user.tag}:`, error);
              }
            }
          }

          const embed = successEmbed(
            `Successfully removed ${role} from ${removedCount} humans.`
          );
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'status': {
          const embed = infoEmbed('No active role removal operations.');
          await interaction.reply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      console.error('Error in rrole command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while removing roles.')],
        ephemeral: true
      });
    }
  }
};
