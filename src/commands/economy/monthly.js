const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed, formatNumber } = require('../../utils/helpers');
const { getUser, updateUser } = require('../../db/userRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('monthly')
    .setDescription('Claim your monthly reward'),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const userData = await getUser(user.id, interaction.guild.id);
      const lastMonthly = userData.last_monthly || 0;
      const now = Date.now();
      const cooldown = 2592000000;

      if (now - lastMonthly < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastMonthly)) / 1000);
        const days = Math.floor(remaining / 86400);
        return interaction.reply({ embeds: [errorEmbed(`You already claimed your monthly! Come back in **${days}** day(s).`)] });
      }

      const reward = 15000;
      await updateUser(user.id, interaction.guild.id, {
        balance: (userData.balance || 0) + reward,
        last_monthly: now
      });

      await interaction.reply({ embeds: [successEmbed(`You claimed your monthly reward of **$${formatNumber(reward)}**!`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to claim monthly.')] });
    }
  }
};
