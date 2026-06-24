const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const quotes = [
  { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
  { text: "So many books, so little time.", author: "Frank Zappa" },
  { text: "A room without books is like a body without a soul.", author: "Marcus Tullius Cicero" },
  { text: "You only live once, but if you do it right, once is enough.", author: "Mae West" },
  { text: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "In three words I can sum up everything I've learned about life: it goes on.", author: "Robert Frost" },
  { text: "If you tell the truth, you don't have to remember anything.", author: "Mark Twain" },
  { text: "Always forgive your enemies; nothing annoys them so much.", author: "Oscar Wilde" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "We are all in the gutter, but some of us are looking at the stars.", author: "Oscar Wilde" }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Get an inspirational quote'),
  cooldown: 3,
  aliases: ['quote'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const quote = quotes[Math.floor(Math.random() * quotes.length)];

            const embed = successEmbed('Quote')
              .setDescription(`*"${quote.text}"*\n\n- **${quote.author}**`)
              .setColor(0x9B59B6);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};