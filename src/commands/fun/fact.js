const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const facts = [
  "Honey never spoils. Archaeologists found 3,000-year-old honey in Egyptian tombs that was still edible.",
  "Octopuses have three hearts, nine brains, and blue blood.",
  "A group of flamingos is called a flamboyance.",
  "Bananas are berries, but strawberries aren't.",
  "The inventor of the Pringles can is buried in one.",
  "A jiffy is an actual unit of time: 1/100th of a second.",
  "The unicorn is Scotland's national animal.",
  "Wombat poop is cube-shaped.",
  "The shortest war in history was between Britain and Zanzibar. It lasted 38 to 45 minutes.",
  "A cloud can weigh more than a million pounds."
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fact')
    .setDescription('Get a random fun fact'),
  cooldown: 3,
  aliases: ['fact'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const fact = facts[Math.floor(Math.random() * facts.length)];

            const embed = successEmbed('Fun Fact')
              .setDescription(fact)
              .setColor(0x00CED1);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};