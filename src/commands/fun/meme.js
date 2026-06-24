const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const memes = [
  { title: "When you finally fix that bug", url: "https://i.imgur.com/5GzHb0A.jpg", color: 0xFF4500 },
  { title: "Debugging at 3am", url: "https://i.imgur.com/3GzHb0A.jpg", color: 0x00FF00 },
  { title: "When the code works", url: "https://i.imgur.com/4GzHb0A.jpg", color: 0x0000FF },
  { title: "Me trying to center a div", url: "https://i.imgur.com/6GzHb0A.jpg", color: 0xFFFF00 },
  { title: "Git commit messages", url: "https://i.imgur.com/7GzHb0A.jpg", color: 0xFF00FF },
  { title: "Stack Overflow be like", url: "https://i.imgur.com/8GzHb0A.jpg", color: 0x00FFFF },
  { title: "When the tests pass", url: "https://i.imgur.com/9GzHb0A.jpg", color: 0xFF8C00 },
  { title: "Production vs Development", url: "https://i.imgur.com/0GzHb0A.jpg", color: 0x800080 }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a random meme'),
  cooldown: 3,
  aliases: ['meme'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const meme = memes[Math.floor(Math.random() * memes.length)];

            const embed = successEmbed(meme.title)
              .setImage(meme.url)
              .setColor(meme.color);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};