const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed, formatNumber } = require('../../utils/helpers');
const { getUser, updateUser } = require('../../db/userRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('yearly')
    .setDescription('Claim your yearly reward'),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const userData = await getUser(user.id, interaction.guild.id);
      const lastYearly = userData.last_yearly || 0;
      const now = Date.now();
      const cooldown = 31536000000;

      if (now - lastYearly < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastYearly)) / 1000);
        const days = Math.floor(remaining / 86400);
        return interaction.reply({ embeds: [errorEmbed(`You already claimed your yearly! Come back in **${days}** day(s).`)] });
      }

      const reward = 100000;
      await updateUser(user.id, interaction.guild.id, {
        balance: (userData.balance || 0) + reward,
        last_yearly: now
      });

      await interaction.reply({ embeds: [successEmbed(`You claimed your yearly reward of **$${formatNumber(reward)}**!`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to claim yearly.')] });
    }
  }
};
