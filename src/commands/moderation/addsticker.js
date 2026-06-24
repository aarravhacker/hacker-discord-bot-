const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addsticker')
    .setDescription('Add a sticker to the server')
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('The name of the sticker')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('emoji')
        .setDescription('The emoji to use as sticker')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions),

  cooldown: 5,
  aliases: ['addemoji', 'addreaction'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const guild = interaction.guild;
      const name = interaction.options.getString('name');
      const emoji = interaction.options.getString('emoji');

      if (!name || !emoji) {
        return interaction.reply({
          embeds: [errorEmbed('Please provide both a name and an emoji.')],
          ephemeral: true
        });
      }

      const db = getDB();

      const existing = await db('stickers')
        .where({ guild_id: guild.id, name })
        .first();

      if (existing) {
        return interaction.reply({
          embeds: [errorEmbed('A sticker with this name already exists.')],
          ephemeral: true
        });
      }

      await db('stickers').insert({
        guild_id: guild.id,
        name,
        emoji,
        added_by: interaction.user.id
      });

      const embed = successEmbed(
        `Successfully added sticker **${name}** with emoji ${emoji}.`
      );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in addsticker command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while adding the sticker.')],
        ephemeral: true
      });
    }
  }
};
