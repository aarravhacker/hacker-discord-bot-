const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed, formatNumber } = require('../../utils/helpers');
const { getUser, updateUser } = require('../../db/userRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposit money to your bank')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to deposit').setRequired(true)),
  cooldown: 5,
  aliases: ['dep'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const amount = interaction.options?.getInteger('amount') || parseInt(args[0]);
      if (!amount || amount <= 0) {
        return interaction.reply({ embeds: [errorEmbed('Please provide a valid amount to deposit.')] });
      }

      const userData = await getUser(user.id, interaction.guild.id);
      const balance = userData.balance || 0;

      if (amount > balance) {
        return interaction.reply({ embeds: [errorEmbed(`You only have $${formatNumber(balance)} in your wallet.`)] });
      }

      await updateUser(user.id, interaction.guild.id, {
        balance: balance - amount,
        bank: (userData.bank || 0) + amount
      });

      await interaction.reply({ embeds: [successEmbed(`Deposited **$${formatNumber(amount)}** to your bank.`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to deposit.')] });
    }
  }
};
