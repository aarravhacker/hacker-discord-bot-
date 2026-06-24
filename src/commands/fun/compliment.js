const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const compliments = [
  "You're like a ray of sunshine on a cloudy day!",
  "You have a smile that could light up a room!",
  "You're more fun than a barrel of monkeys!",
  "You're someone's reason to smile.",
  "You're better than a triple-scoop ice cream cone!",
  "You have the best laugh.",
  "You're like a human version of a golden retriever!",
  "You make the world a better place just by being you!",
  "You're the bees' knees!",
  "You're absolutely bursting with awesomeness!"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('compliment')
    .setDescription('Compliment a user')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to compliment').setRequired(false)
    ),
  cooldown: 3,
  aliases: ['compliment'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const self = isSlash ? interaction.user : interaction.author;
            const target = interaction.options?.getUser('user') || interaction.mentions?.users?.first() || self;
            const compliment = compliments[Math.floor(Math.random() * compliments.length)];

            const embed = successEmbed('Compliment')
              .setDescription(`${target.username}, ${compliment}`)
              .setColor(0xFF69B4);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};