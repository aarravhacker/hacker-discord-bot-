const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const dogFacts = [
  "Dogs can understand up to 250 words and gestures.",
  "A dog's nose print is unique, much like a human fingerprint.",
  "Dogs can smell up to 100,000 times better than humans.",
  "The Basenji is the only breed of dog that doesn't bark.",
  "Dogs have three eyelids: an upper, a lower, and a third called a nictitating membrane.",
  "A dog's sense of smell is 10,000 times stronger than humans.",
  "Dogs can see in color, though they see primarily in blue and yellow.",
  "The average dog can run about 19 mph.",
  "Dogs curl up in a ball when sleeping to protect their organs.",
  "A one-year-old dog is as physically mature as a 15-year-old human."
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dogfact')
    .setDescription('Get a random dog fact'),
  cooldown: 3,
  aliases: ['dogfact'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const fact = dogFacts[Math.floor(Math.random() * dogFacts.length)];

            const embed = successEmbed('Dog Fact 🐶')
              .setDescription(fact)
              .setColor(0x8B4513);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};