const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stickersearch')
    .setDescription('Search server stickers')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('The search query')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  cooldown: 5,
  aliases: ['searchsticker', 'findsticker'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const guild = interaction.guild;
      const query = interaction.options.getString('query');

      if (!query) {
        return interaction.reply({
          embeds: [errorEmbed('Please provide a search query.')],
          ephemeral: true
        });
      }

      const db = getDB();

      const stickers = await db('stickers')
        .where({ guild_id: guild.id })
        .where('name', 'like', `%${query}%`);

      if (stickers.length === 0) {
        return interaction.reply({
          embeds: [infoEmbed('No stickers found matching your query.')],
          ephemeral: true
        });
      }

      const stickerList = stickers.map(
        sticker => `**${sticker.name}** - ${sticker.emoji}`
      ).join('\n');

      const embed = infoEmbed(
        `**Stickers matching "${query}":**\n${stickers.length > 20 ? stickerList.split('\n').slice(0, 20).join('\n') + '\n... and more' : stickerList}`
      );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in stickersearch command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while searching stickers.')],
        ephemeral: true
      });
    }
  }
};
