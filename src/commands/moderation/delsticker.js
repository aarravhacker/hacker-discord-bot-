const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delsticker')
    .setDescription('Delete a sticker from the server')
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('The name of the sticker to delete')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions),

  cooldown: 5,
  aliases: ['deletesticker', 'removesticker'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const guild = interaction.guild;
      const name = interaction.options.getString('name');

      if (!name) {
        return interaction.reply({
          embeds: [errorEmbed('Please provide the name of the sticker to delete.')],
          ephemeral: true
        });
      }

      const db = getDB();

      const sticker = await db('stickers')
        .where({ guild_id: guild.id, name })
        .first();

      if (!sticker) {
        return interaction.reply({
          embeds: [errorEmbed('No sticker found with that name.')],
          ephemeral: true
        });
      }

      await db('stickers')
        .where({ guild_id: guild.id, name })
        .del();

      const embed = successEmbed(`Successfully deleted sticker **${name}**.`);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in delsticker command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while deleting the sticker.')],
        ephemeral: true
      });
    }
  }
};
