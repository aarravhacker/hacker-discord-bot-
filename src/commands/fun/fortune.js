const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const fortunes = [
  "A beautiful, smart, and loving person will come into your life.",
  "A dubious ally may be an enemy in disguise.",
  "A faithful friend is a strong defense.",
  "A fresh start will put you on your way.",
  "A golden egg of opportunity falls into your lap this month.",
  "A good time to finish up old tasks.",
  "A lifetime of happiness lies ahead of you.",
  "A light heart carries you through all the hard times.",
  "A new perspective will come with the new year.",
  "A pleasant dream will help you forget your worries."
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fortune')
    .setDescription('Get your fortune'),
  cooldown: 3,
  aliases: ['fortune'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];

            const embed = successEmbed('🔮 Fortune Cookie')
              .setDescription(fortune)
              .setColor(0xFFD700);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};