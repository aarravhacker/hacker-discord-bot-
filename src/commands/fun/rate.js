const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const categories = [
  "that", "this", "it", "the thing", "whatever you're thinking about",
  "your message", "your existence", "your vibe", "your energy", "you"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rate')
    .setDescription('Rate something out of 10')
    .addStringOption(option =>
      option.setName('thing').setDescription('What to rate').setRequired(false)
    ),
  cooldown: 3,
  aliases: ['rate'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const thing = interaction.options?.getString('thing') || args?.join(' ') || categories[Math.floor(Math.random() * categories.length)];
            const rating = Math.floor(Math.random() * 11);
            const ratingBar = '⭐'.repeat(rating) + '☆'.repeat(10 - rating);

            let review;
            if (rating >= 9) review = "Absolutely amazing!";
            else if (rating >= 7) review = "Pretty great!";
            else if (rating >= 5) review = "Not bad at all!";
            else if (rating >= 3) review = "Could be better...";
            else review = "Yikes...";

            const embed = successEmbed('Rate')
              .setDescription(`I rate **${thing}** a **${rating}/10**`)
              .addField('Rating', ratingBar)
              .addField('Review', review)
              .setColor(0xFFD700);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};