const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed, formatNumber } = require('../../utils/helpers');
const { getUser, updateUser } = require('../../db/userRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Withdraw money from your bank')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to withdraw').setRequired(true)),
  cooldown: 5,
  aliases: ['wd'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const amount = interaction.options?.getInteger('amount') || parseInt(args[0]);
      if (!amount || amount <= 0) {
        return interaction.reply({ embeds: [errorEmbed('Please provide a valid amount to withdraw.')] });
      }

      const userData = await getUser(user.id, interaction.guild.id);
      const bank = userData.bank || 0;

      if (amount > bank) {
        return interaction.reply({ embeds: [errorEmbed(`You only have $${formatNumber(bank)} in your bank.`)] });
      }

      await updateUser(user.id, interaction.guild.id, {
        balance: (userData.balance || 0) + amount,
        bank: bank - amount
      });

      await interaction.reply({ embeds: [successEmbed(`Withdrew **$${formatNumber(amount)}** from your bank.`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to withdraw.')] });
    }
  }
};
