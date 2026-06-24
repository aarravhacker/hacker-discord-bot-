const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, formatNumber } = require('../../utils/helpers');
const { getUser, updateUser } = require('../../db/userRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly')
    .setDescription('Claim your weekly reward'),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const userData = await getUser(user.id, interaction.guild.id);
      const lastWeekly = userData.last_weekly || 0;
      const now = Date.now();
      const cooldown = 604800000;

      if (now - lastWeekly < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastWeekly)) / 1000);
        const days = Math.floor(remaining / 86400);
        const hours = Math.floor((remaining % 86400) / 3600);
        return interaction.reply({ embeds: [errorEmbed(`You already claimed your weekly! Come back in **${days}d ${hours}h**.`)] });
      }

      const reward = 3000;
      await updateUser(user.id, interaction.guild.id, {
        balance: (userData.balance || 0) + reward,
        last_weekly: now
      });

      await interaction.reply({ embeds: [successEmbed(`You claimed your weekly reward of **$${formatNumber(reward)}**!`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to claim weekly.')] });
    }
  }
};
