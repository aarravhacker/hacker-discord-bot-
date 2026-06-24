const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getUser, updateUser } = require('../../db/userRepository');
const config = require('../../config');
const shopItems = require('./shop').items;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('equip')
    .setDescription('Equip an item')
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
        return interaction.reply({ embeds: [errorEmbed('Usage: /equip <item number>')] });
      }

      const userData = await getUser(user.id, interaction.guild.id);
      const inventory = userData.inventory || [];

      if (!inventory.includes(itemNum)) {
        return interaction.reply({ embeds: [errorEmbed('You don\'t have that item.')] });
      }

      const item = shopItems.find(i => i.id === itemNum);
      if (!item) {
        return interaction.reply({ embeds: [errorEmbed('Item not found.')] });
      }

      const equipped = userData.equipped || [];
      if (equipped.includes(itemNum)) {
        return interaction.reply({ embeds: [errorEmbed('That item is already equipped.')] });
      }

      equipped.push(itemNum);
      await updateUser(user.id, interaction.guild.id, { equipped });

      await interaction.reply({ embeds: [successEmbed(`Equipped **${item.emoji} ${item.name}**!`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to equip item.')] });
    }
  }
};
