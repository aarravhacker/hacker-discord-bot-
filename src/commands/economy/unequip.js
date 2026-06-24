const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getUser, updateUser } = require('../../db/userRepository');
const config = require('../../config');
const shopItems = require('./shop').items;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unequip')
    .setDescription('Unequip an item')
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
        return interaction.reply({ embeds: [errorEmbed('Usage: /unequip <item number>')] });
      }

      const userData = await getUser(user.id, interaction.guild.id);
      const equipped = userData.equipped || [];

      const index = equipped.indexOf(itemNum);
      if (index === -1) {
        return interaction.reply({ embeds: [errorEmbed('That item is not equipped.')] });
      }

      const item = shopItems.find(i => i.id === itemNum);
      equipped.splice(index, 1);
      await updateUser(user.id, interaction.guild.id, { equipped });

      await interaction.reply({ embeds: [successEmbed(`Unequipped **${item?.emoji || ''} ${item?.name || 'Unknown'}**!`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to unequip item.')] });
    }
  }
};
