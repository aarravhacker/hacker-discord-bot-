const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getUser, updateUser } = require('../../db/userRepository');
const config = require('../../config');
const shopItems = require('./shop').items;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('use')
    .setDescription('Use an item')
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
        return interaction.reply({ embeds: [errorEmbed('Usage: /use <item number>')] });
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

      inventory.splice(itemIndex, 1);
      let message = '';

      switch (itemNum) {
        case 8: // Potion
          message = 'You used a Potion and restored health!';
          break;
        default:
          message = `You used **${item.emoji} ${item.name}**!`;
      }

      await updateUser(user.id, interaction.guild.id, { inventory });
      await interaction.reply({ embeds: [successEmbed(message)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to use item.')] });
    }
  }
};
