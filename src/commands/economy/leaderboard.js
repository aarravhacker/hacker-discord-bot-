const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed, formatNumber } = require('../../utils/helpers');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the economy leaderboard'),
  cooldown: 10,
  aliases: ['lb', 'richest', 'top'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const db = getDB();
      const users = await db('users')
        .where({ guild_id: interaction.guild.id })
        .orderByRaw('COALESCE(balance, 0) + COALESCE(bank, 0) DESC')
        .limit(10);

      if (users.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('No users found on the leaderboard.')] });
      }

      const medals = ['🥇', '🥈', '🥉'];
      const description = users.map((user, i) => {
        const medal = medals[i] || `**${i + 1}.**`;
        const total = (user.balance || 0) + (user.bank || 0);
        return `${medal} <@${user.user_id}> - $${formatNumber(total)}`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.economy || '#FFD700')
        .setTitle('Leaderboard')
        .setDescription(description)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to load leaderboard.')] });
    }
  }
};
