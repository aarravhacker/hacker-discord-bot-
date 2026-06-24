const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const catFacts = [
  "Cats sleep for about 70% of their lives.",
  "A group of cats is called a clowder.",
  "Cats have over 20 vocalizations, including the purr.",
  "A cat's purr vibrates at 25-150 Hz, which can promote healing.",
  "Cats can rotate their ears 180 degrees.",
  "The first cat in space was a French cat named Félicette in 1963.",
  "Cats have a specialized collarbone that allows them to always land on their feet.",
  "A cat can jump up to six times its length.",
  "Cats spend about 30-50% of their day grooming themselves.",
  "A cat's brain is 90% similar to a human's brain."
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('catfact')
    .setDescription('Get a random cat fact'),
  cooldown: 3,
  aliases: ['catfact'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const fact = catFacts[Math.floor(Math.random() * catFacts.length)];

            const embed = successEmbed('Cat Fact 🐱')
              .setDescription(fact)
              .setColor(0xFF69B4);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};