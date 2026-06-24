const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const dankMemes = [
  { title: "Modern problems require modern solutions", url: "https://i.imgur.com/dank1.jpg", color: 0xFF0000 },
  { title: "When you realize it's Monday", url: "https://i.imgur.com/dank2.jpg", color: 0x00FF00 },
  { title: "Nobody: ... Me: *writes code at 3am*", url: "https://i.imgur.com/dank3.jpg", color: 0x0000FF },
  { title: "When the CI/CD pipeline breaks", url: "https://i.imgur.com/dank4.jpg", color: 0xFFFF00 },
  { title: "Me explaining why my code is correct", url: "https://i.imgur.com/dank5.jpg", color: 0xFF00FF },
  { title: "When someone says CSS is easy", url: "https://i.imgur.com/dank6.jpg", color: 0x00FFFF },
  { title: "Backend vs Frontend developers", url: "https://i.imgur.com/dank7.jpg", color: 0xFF8C00 },
  { title: "When the deploy works first try", url: "https://i.imgur.com/dank8.jpg", color: 0x800080 }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dankmeme')
    .setDescription('Get a dank meme'),
  cooldown: 3,
  aliases: ['dankmeme', 'dank'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const meme = dankMemes[Math.floor(Math.random() * dankMemes.length)];

            const embed = successEmbed(meme.title)
              .setImage(meme.url)
              .setColor(meme.color);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};