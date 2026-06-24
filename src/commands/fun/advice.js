const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const adviceList = [
  "Don't be afraid to give up the good to go for the great.",
  "The only way to do great work is to love what you do.",
  "In the middle of difficulty lies opportunity.",
  "Life is what happens when you're busy making other plans.",
  "The future belongs to those who believe in the beauty of their dreams.",
  "It is during our darkest moments that we must focus to see the light.",
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "Your time is limited, don't waste it living someone else's life.",
  "If you look at what you have in life, you'll always have more.",
  "If life gives you lemons, make lemonade."
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('advice')
    .setDescription('Get some random advice'),
  cooldown: 3,
  aliases: ['advice'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const advice = adviceList[Math.floor(Math.random() * adviceList.length)];

            const embed = successEmbed('💡 Advice')
              .setDescription(advice)
              .setColor(0x00CED1);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};