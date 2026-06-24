const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, formatNumber } = require('../../utils/helpers');
const { getUser, updateUser } = require('../../db/userRepository');
const shopItems = require('./shop').items;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('Sell an item')
    .addIntegerOption(opt => opt.setName('item').setDescription('Item number').setRequired(true)),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const itemNum = interaction.options?.getInteger('item') || parseInt(args[0]);
      if (!itemNum) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /sell <item number>\nUse /inventory to see your items.')] });
      }

      const userData = await getUser(user.id, interaction.guild.id);
      const inventory = userData.inventory || [];

      const itemIndex = inventory.indexOf(itemNum);
      if (itemIndex === -1) {
        return interaction.reply({ embeds: [errorEmbed('You don\'t have that item.')] });
      }

      const item = shopItems.find(i => i.id === itemNum);
      if (!item) {
        return interaction.reply({ embeds: [errorEmbed('Item not found.')] });
      }

      const sellPrice = Math.floor(item.price * 0.7);
      inventory.splice(itemIndex, 1);

      await updateUser(user.id, interaction.guild.id, {
        balance: (userData.balance || 0) + sellPrice,
        inventory: inventory
      });

      await interaction.reply({ embeds: [successEmbed(`You sold **${item.emoji} ${item.name}** for $${formatNumber(sellPrice)}!`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to sell item.')] });
    }
  }
};
