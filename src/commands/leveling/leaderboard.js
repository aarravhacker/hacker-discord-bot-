const { SlashCommandBuilder } = require('discord.js');
const { getUser } = require('../../db/userRepository');
const { successEmbed, errorEmbed, formatNumber } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the server leaderboard')
    .addIntegerOption(option =>
      option.setName('page').setDescription('Page number').setRequired(false)
    ),
  cooldown: 10,
  aliases: ['leaderboard', 'lb', 'top'],
  prefix: true,
  async execute(interaction, args) {
    const guildId = interaction.guild?.id;
    const page = interaction.options?.getInteger('page') || parseInt(args?.[0]) || 1;
    const perPage = 10;

    try {
      const knex = getDB();
      const users = await knex('users')
        .where({ guild_id: guildId })
        .orderBy('level', 'desc')
        .orderBy('xp', 'desc')
        .limit(perPage)
        .offset((page - 1) * perPage);

      if (!users || users.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('No users found on this page.')] });
      }

      const totalCount = await knex('users').where({ guild_id: guildId }).count('id as count').first();
      const totalPages = Math.ceil((totalCount?.count || 0) / perPage);

      let description = '';
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const rank = (page - 1) * perPage + i + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
        description += `${medal} <@${user.user_id}> - Level ${user.level} (${formatNumber(user.xp || 0)} XP)\n`;
      }

      const embed = successEmbed('Server Leaderboard')
        .setDescription(description)
        .setFooter({ text: `Page ${page} of ${totalPages}` })
        .setColor(0xFFD700);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while fetching leaderboard.')] });
    }
  }
};
