const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const dadJokes = [
  "I'm afraid for the calendar. Its days are numbered.",
  "Did you hear about the restaurant on the moon? Great food, no atmosphere.",
  "What do you call a fake noodle? An impasta!",
  "Why don't scientists trust atoms? Because they make up everything!",
  "I'm on a seafood diet. I see food and I eat it.",
  "What do you call a bear with no teeth? A gummy bear!",
  "I used to hate facial hair, but then it grew on me.",
  "What did the ocean say to the beach? Nothing, it just waved.",
  "Why don't eggs tell jokes? They'd crack each other up!",
  "I'm reading a book about anti-gravity. It's impossible to put down!"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dadjoke')
    .setDescription('Get a random dad joke'),
  cooldown: 3,
  aliases: ['dadjoke'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const joke = dadJokes[Math.floor(Math.random() * dadJokes.length)];

            const embed = successEmbed('👨 Dad Joke')
              .setDescription(joke)
              .setColor(0x8B4513);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};