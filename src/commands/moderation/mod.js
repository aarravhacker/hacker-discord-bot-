const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Moderator management')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a moderator')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to add as moderator')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a moderator')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to remove from moderator')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('reset').setDescription('Remove all moderators')
    )
    .addSubcommand(sub =>
      sub
        .setName('role')
        .setDescription('Set moderator role')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to set as moderator')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Set moderation log channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel for moderation logs')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(sub =>
      sub.setName('show').setDescription('Show all moderators')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  cooldown: 5,
  aliases: ['modlist', 'moderators'],
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

          const existing = await db('moderators')
            .where({ guild_id: guild.id, user_id: user.id })
            .first();

          if (existing) {
            return interaction.reply({
              embeds: [errorEmbed('This user is already a moderator.')],
              ephemeral: true
            });
          }

          await db('moderators').insert({
            guild_id: guild.id,
            user_id: user.id,
            role_id: null,
            channel_id: null
          });

          const embed = successEmbed(`Successfully added ${user} as a moderator.`);
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'remove': {
          const user = interaction.options.getUser('user');

          const existing = await db('moderators')
            .where({ guild_id: guild.id, user_id: user.id })
            .first();

          if (!existing) {
            return interaction.reply({
              embeds: [errorEmbed('This user is not a moderator.')],
              ephemeral: true
            });
          }

          await db('moderators')
            .where({ guild_id: guild.id, user_id: user.id })
            .del();

          const embed = successEmbed(`Successfully removed ${user} from moderators.`);
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'reset': {
          await db('moderators').where({ guild_id: guild.id }).del();
          const embed = successEmbed('Successfully removed all moderators.');
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'role': {
          const role = interaction.options.getRole('role');

          await db('moderators')
            .where({ guild_id: guild.id })
            .update({ role_id: role.id });

          const embed = successEmbed(`Successfully set ${role} as the moderator role.`);
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'setup': {
          const channel = interaction.options.getChannel('channel');

          await db('moderators')
            .where({ guild_id: guild.id })
            .update({ channel_id: channel.id });

          const embed = successEmbed(
            `Successfully set ${channel} as the moderation log channel.`
          );
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'show': {
          const moderators = await db('moderators').where({ guild_id: guild.id });

          if (moderators.length === 0) {
            return interaction.reply({
              embeds: [infoEmbed('No moderators found.')],
              ephemeral: true
            });
          }

          const modList = moderators.map(mod => `<@${mod.user_id}>`).join('\n');
          const embed = infoEmbed(`**Moderators:**\n${modList}`);
          await interaction.reply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      console.error('Error in mod command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while managing moderators.')],
        ephemeral: true
      });
    }
  }
};
