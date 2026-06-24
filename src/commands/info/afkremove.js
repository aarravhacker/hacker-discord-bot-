const { SlashCommandBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afkremove')
    .setDescription('Remove your AFK status'),
  cooldown: 5,
  aliases: ['unafk', 'afkoff'],
  prefix: true,

  async execute(interaction, args) {
    const db = getDB();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    try {
      const existing = await db('afk')
        .where({ guild_id: guildId, user_id: userId })
        .first();

      if (!existing) {
        return interaction.reply({
          embeds: [errorEmbed('You are not currently AFK.')],
          ephemeral: true,
        });
      }

      await db('afk')
        .where({ guild_id: guildId, user_id: userId })
        .del();

      return interaction.reply({
        embeds: [successEmbed('Your AFK status has been removed.')],
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({
        embeds: [errorEmbed('Failed to remove AFK status.')],
        ephemeral: true,
      });
    }
  },
};
