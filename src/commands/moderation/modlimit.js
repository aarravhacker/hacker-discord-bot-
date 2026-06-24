const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlimit')
    .setDescription('Moderation limits')
    .addSubcommand(sub =>
      sub.setName('reset').setDescription('Reset all limits')
    )
    .addSubcommand(sub =>
      sub
        .setName('set')
        .setDescription('Set limits')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('The type of limit to set')
            .setRequired(true)
            .addChoices(
              { name: 'admin', value: 'admin' },
              { name: 'mod', value: 'mod' }
            )
        )
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('The limit value')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('show').setDescription('Show all limits')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  cooldown: 5,
  aliases: ['modlimits', 'setmodlimit'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const guild = interaction.guild;
      const subcommand = interaction.options.getSubcommand();
      const db = getDB();

      switch (subcommand) {
        case 'reset': {
          await db('mod_limits')
            .where({ guild_id: guild.id })
            .del();

          const embed = successEmbed('Successfully reset all moderation limits.');
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'set': {
          const type = interaction.options.getString('type');
          const limit = interaction.options.getInteger('limit');

          const existing = await db('mod_limits')
            .where({ guild_id: guild.id })
            .first();

          if (existing) {
            await db('mod_limits')
              .where({ guild_id: guild.id })
              .update({ [`${type}_limit`]: limit });
          } else {
            await db('mod_limits').insert({
              guild_id: guild.id,
              admin_limit: type === 'admin' ? limit : 0,
              mod_limit: type === 'mod' ? limit : 0
            });
          }

          const embed = successEmbed(
            `Successfully set ${type} limit to ${limit}.`
          );
          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'show': {
          const limits = await db('mod_limits')
            .where({ guild_id: guild.id })
            .first();

          if (!limits) {
            return interaction.reply({
              embeds: [infoEmbed('No limits set.')],
              ephemeral: true
            });
          }

          const embed = infoEmbed(
            `**Moderation Limits:**\nAdmin Limit: ${limits.admin_limit}\nMod Limit: ${limits.mod_limit}`
          );
          await interaction.reply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      console.error('Error in modlimit command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while managing limits.')],
        ephemeral: true
      });
    }
  }
};
