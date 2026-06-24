const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed, formatNumber } = require('../../utils/helpers');
const { getUser, updateUser } = require('../../db/userRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Pay another user')
    .addUserOption(opt => opt.setName('user').setDescription('User to pay').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to pay').setRequired(true)),
  cooldown: 5,
  aliases: ['give', 'transfer', 'send'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const target = interaction.options?.getUser('user') || (args[0] ? interaction.guild.members.cache.get(args[0])?.user : null);
      const amount = interaction.options?.getInteger('amount') || parseInt(args[1]);

      if (!target || !amount) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /pay <user> <amount>')] });
      }

      if (target.id === user.id) {
        return interaction.reply({ embeds: [errorEmbed('You cannot pay yourself.')] });
      }

      if (target.bot) {
        return interaction.reply({ embeds: [errorEmbed('You cannot pay bots.')] });
      }

      if (amount <= 0) {
        return interaction.reply({ embeds: [errorEmbed('Amount must be positive.')] });
      }

      const senderData = await getUser(user.id, interaction.guild.id);
      if ((senderData.balance || 0) < amount) {
        return interaction.reply({ embeds: [errorEmbed(`You only have $${formatNumber(senderData.balance || 0)}.`)] });
      }

      const receiverData = await getUser(target.id, interaction.guild.id);

      await updateUser(user.id, interaction.guild.id, {
        balance: (senderData.balance || 0) - amount
      });
      await updateUser(target.id, interaction.guild.id, {
        balance: (receiverData.balance || 0) + amount
      });

      await interaction.reply({ embeds: [successEmbed(`Paid **$${formatNumber(amount)}** to ${target.tag}!`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to pay.')] });
    }
  }
};
