const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const jokes = [
  "Why don't scientists trust atoms? Because they make up everything!",
  "Why did the scarecrow win an award? He was outstanding in his field!",
  "What do you call a fake noodle? An impasta!",
  "Why don't eggs tell jokes? They'd crack each other up!",
  "I'm reading a book about anti-gravity. It's impossible to put down!",
  "What do you call a bear with no teeth? A gummy bear!",
  "Why did the math book look so sad? Because it had too many problems!",
  "What do you call a dog that does magic? A Labracadabrador!",
  "Why don't skeletons fight each other? They don't have the guts!",
  "What did the ocean say to the beach? Nothing, it just waved!"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Get a random joke'),
  cooldown: 3,
  aliases: ['joke'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const joke = jokes[Math.floor(Math.random() * jokes.length)];

            const embed = successEmbed('Here\'s a joke for you!')
              .setDescription(joke)
              .setColor(0xFFD700);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};