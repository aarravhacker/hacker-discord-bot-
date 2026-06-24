const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const { getUser } = require('../../db/userRepository');
const config = require('../../config');
const shopItems = require('./shop').items;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your inventory'),
  cooldown: 5,
  aliases: ['inv', 'items'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const user = interaction.options?.getUser('user') || (args[0] ? interaction.guild.members.cache.get(args[0])?.user : null) || interaction.user;
      const userData = await getUser(user.id, interaction.guild.id);
      const inventory = userData.inventory || [];

      if (inventory.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('Your inventory is empty.')] });
      }

      const itemCounts = {};
      for (const itemId of inventory) {
        itemCounts[itemId] = (itemCounts[itemId] || 0) + 1;
      }

      const description = Object.entries(itemCounts).map(([id, count]) => {
        const item = shopItems.find(i => i.id === parseInt(id));
        if (!item) return `Unknown Item (ID: ${id}) x${count}`;
        return `${item.emoji} **${item.name}** x${count}`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.economy || '#FFD700')
        .setTitle(`${user.tag}'s Inventory`)
        .setDescription(description)
        .setFooter({ text: `${inventory.length} total item(s)` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to load inventory.')] });
    }
  }
};
