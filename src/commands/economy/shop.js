const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

const items = [
  { id: 1, name: 'Fishing Rod', price: 100, description: 'Catch fish for money', emoji: '🎣' },
  { id: 2, name: 'Pickaxe', price: 250, description: 'Mine for valuable ores', emoji: '⛏️' },
  { id: 3, name: 'Laptop', price: 500, description: 'Start a coding business', emoji: '💻' },
  { id: 4, name: 'Car', price: 2000, description: 'Work as a taxi driver', emoji: '🚗' },
  { id: 5, name: 'House', price: 10000, description: 'Rent out for passive income', emoji: '🏠' },
  { id: 6, name: 'Diamond Sword', price: 750, description: 'A powerful weapon', emoji: '⚔️' },
  { id: 7, name: 'Shield', price: 300, description: 'Protect yourself', emoji: '🛡️' },
  { id: 8, name: 'Potion', price: 50, description: 'Restore health', emoji: '🧪' },
  { id: 9, name: 'Gem', price: 1500, description: 'A valuable gemstone', emoji: '💎' },
  { id: 10, name: 'Crown', price: 5000, description: 'A golden crown', emoji: '👑' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View the shop'),
  cooldown: 5,
  aliases: ['store'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const embed = new EmbedBuilder()
              .setColor(config.embedColors.economy || '#FFD700')
              .setTitle('Shop')
              .setDescription(items.map(item => `${item.emoji} **${item.name}** - $${item.price}\n${item.description}`).join('\n\n'))
              .setFooter({ text: 'Use /buy <item number> to purchase' })
              .setTimestamp();

            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};

module.exports.items = items;