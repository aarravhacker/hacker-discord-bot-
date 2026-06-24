const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const puns = [
  "I'm on a seafood diet. I see food and I eat it.",
  "What do you call a fake stone? A sham-rock!",
  "I used to hate facial hair, but then it grew on me.",
  "What do you call a bear with no teeth? A gummy bear!",
  "I'm reading a book on anti-gravity. It's impossible to put down!",
  "What did the grape do when it got stepped on? Nothing, it just let out a little wine.",
  "I'm afraid for the calendar. Its days are numbered.",
  "Why did the scarecrow win an award? He was outstanding in his field!",
  "What do you call a dog that does magic? A Labracadabrador!",
  "I'm on a whiskey diet. I've lost three days already."
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pun')
    .setDescription('Get a random pun'),
  cooldown: 3,
  aliases: ['pun'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const pun = puns[Math.floor(Math.random() * puns.length)];

            const embed = successEmbed('Here\'s a pun for you!')
              .setDescription(pun)
              .setColor(0xFF69B4);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};