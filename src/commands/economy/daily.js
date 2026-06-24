const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, formatNumber } = require('../../utils/helpers');
const { getUser, updateUser } = require('../../db/userRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward'),
  cooldown: 5,
  aliases: ['weekly', 'monthly', 'yearly'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const userData = await getUser(user.id, interaction.guild.id);
      const lastDaily = userData.last_daily || 0;
      const now = Date.now();
      const cooldown = 86400000;

      if (now - lastDaily < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastDaily)) / 1000);
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        return interaction.reply({ embeds: [errorEmbed(`You already claimed your daily! Come back in **${hours}h ${minutes}m**.`)] });
      }

      const baseReward = 500;
      const streak = (userData.daily_streak || 0) + 1;
      const bonus = Math.min(streak * 50, 500);
      const total = baseReward + bonus;

      await updateUser(user.id, interaction.guild.id, {
        balance: (userData.balance || 0) + total,
        last_daily: now,
        daily_streak: streak
      });

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.economy || '#FFD700')
        .setTitle('Daily Reward')
        .setDescription(`You claimed **$${formatNumber(total)}**!\nBase: $${formatNumber(baseReward)} | Streak Bonus: $${formatNumber(bonus)}\nCurrent streak: **${streak}** day(s)`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to claim daily.')] });
    }
  }
};
