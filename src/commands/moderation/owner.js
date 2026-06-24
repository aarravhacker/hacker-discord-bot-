const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('owner')
    .setDescription('Owner management')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add an owner')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to add as owner')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove an owner')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to remove from owner')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('reset').setDescription('Remove all owners')
    )
    .addSubcommand(sub =>
      sub.setName('show').setDescription('Show all owners')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  cooldown: 5,
  aliases: ['ownerlist', 'owners'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();

    try {
      const guild = interaction.guild;
      const db = getDB();

      let subcommand;
      let targetUser;

      if (isSlash) {
        subcommand = interaction.options.getSubcommand();
        if (subcommand === 'add' || subcommand === 'remove') {
          targetUser = interaction.options.getUser('user');
        }
      } else {
        const raw = (args?.[0] || '').toLowerCase();
        if (!['add', 'remove', 'reset', 'show'].includes(raw)) {
          return interaction.reply({ embeds: [errorEmbed('Error', 'Usage: !owner <add|remove|reset|show> [user]')] });
        }
        subcommand = raw;
        if (subcommand === 'add' || subcommand === 'remove') {
          const userId = args?.[1]?.replace(/[<@!>]/g, '');
          if (!userId) {
            return interaction.reply({ embeds: [errorEmbed('Error', 'Please specify a user.')] });
          }
          targetUser = await interaction.client.users.fetch(userId).catch(() => null);
          if (!targetUser) {
            return interaction.reply({ embeds: [errorEmbed('Error', 'User not found.')] });
          }
        }
      }

      switch (subcommand) {
        case 'add': {
          const existing = await db('owners')
            .where({ guild_id: guild.id, user_id: targetUser.id })
            .first();

          if (existing) {
            return interaction.reply({ embeds: [errorEmbed('Error', 'This user is already an owner.')] });
          }

          await db('owners').insert({
            guild_id: guild.id,
            user_id: targetUser.id,
            added_by: interaction.user.id
          });

          const embed = successEmbed('Owner Added', `Successfully added ${targetUser} as an owner.`);
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'remove': {
          const existing = await db('owners')
            .where({ guild_id: guild.id, user_id: targetUser.id })
            .first();

          if (!existing) {
            return interaction.reply({ embeds: [errorEmbed('Error', 'This user is not an owner.')] });
          }

          await db('owners')
            .where({ guild_id: guild.id, user_id: targetUser.id })
            .del();

          const embed = successEmbed('Owner Removed', `Successfully removed ${targetUser} from owners.`);
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'reset': {
          await db('owners').where({ guild_id: guild.id }).del();
          const embed = successEmbed('Owners Reset', 'Successfully removed all owners.');
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'show': {
          const owners = await db('owners').where({ guild_id: guild.id });

          if (owners.length === 0) {
            return interaction.reply({ embeds: [infoEmbed('No owners found for this server.')] });
          }

          const ownerList = owners.map(owner => `<@${owner.user_id}>`).join('\n');
          const embed = infoEmbed(`**Owners (${owners.length})**`, ownerList);
          await interaction.reply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      console.error('Error in owner command:', error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'An error occurred while managing owners.')] });
    }
  }
};