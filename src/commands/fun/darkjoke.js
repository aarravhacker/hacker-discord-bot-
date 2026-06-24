const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const darkJokes = [
  "I have a joke about trickle-down economics, but 99% of you won't get it.",
  "What's the difference between a Lamborghini and a pile of dead bodies? I don't have a Lamborghini in my garage.",
  "I told my wife she was drawing her eyebrows too high. She looked surprised.",
  "Why don't orphans play baseball? They don't know where home is.",
  "What's the hardest part of a vegetable to eat? The wheelchair.",
  "I have a stepladder. I never knew my real ladder.",
  "What's the difference between a baby and a sweet potato? About 170 calories.",
  "Why did the girl fall off the swing? Because she had no arms.",
  "What do you call a dog with no legs? It doesn't matter, he's not coming anyway.",
  "What's red and bad for your teeth? A brick."
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('darkjoke')
    .setDescription('Get a dark humor joke'),
  cooldown: 5,
  aliases: ['darkjoke'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const joke = darkJokes[Math.floor(Math.random() * darkJokes.length)];

            const embed = successEmbed('🌑 Dark Joke')
              .setDescription(joke)
              .setColor(0x1a1a2e);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};