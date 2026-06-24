const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, formatNumber } = require('../../utils/helpers');
const { getUser, updateUser } = require('../../db/userRepository');
const config = require('../../config');
const shopItems = require('./shop').items;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the shop')
    .addIntegerOption(opt => opt.setName('item').setDescription('Item number from shop').setRequired(true)),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const itemNum = interaction.options?.getInteger('item') || parseInt(args[0]);
      if (!itemNum) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /buy <item number>\nUse /shop to see items.')] });
      }

      const item = shopItems.find(i => i.id === itemNum);
      if (!item) {
        return interaction.reply({ embeds: [errorEmbed('Invalid item number. Use /shop to see items.')] });
      }

      const userData = await getUser(user.id, interaction.guild.id);
      const balance = userData.balance || 0;

      if (balance < item.price) {
        return interaction.reply({ embeds: [errorEmbed(`You need $${formatNumber(item.price)} but only have $${formatNumber(balance)}.`)] });
      }

      const inventory = userData.inventory || [];
      inventory.push(item.id);

      await updateUser(user.id, interaction.guild.id, {
        balance: balance - item.price,
        inventory: inventory
      });

      await interaction.reply({ embeds: [successEmbed(`You bought **${item.emoji} ${item.name}** for $${formatNumber(item.price)}!`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to buy item.')] });
    }
  }
};
