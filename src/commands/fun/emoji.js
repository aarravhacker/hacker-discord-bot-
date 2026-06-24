const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const emojis = [
  { name: 'Happy', emoji: '😊', category: 'Smileys' },
  { name: 'Laughing', emoji: '😂', category: 'Smileys' },
  { name: 'Love', emoji: '😍', category: 'Smileys' },
  { name: 'Cool', emoji: '😎', category: 'Smileys' },
  { name: 'Wink', emoji: '😉', category: 'Smileys' },
  { name: 'Fire', emoji: '🔥', category: 'Objects' },
  { name: 'Star', emoji: '⭐', category: 'Objects' },
  { name: 'Heart', emoji: '❤️', category: 'Symbols' },
  { name: 'Thumbs Up', emoji: '👍', category: 'Gestures' },
  { name: 'Clap', emoji: '👏', category: 'Gestures' },
  { name: 'Party', emoji: '🎉', category: 'Activities' },
  { name: 'Rocket', emoji: '🚀', category: 'Objects' },
  { name: 'Rainbow', emoji: '🌈', category: 'Symbols' },
  { name: 'Lightning', emoji: '⚡', category: 'Weather' },
  { name: 'Sun', emoji: '☀️', category: 'Weather' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emoji')
    .setDescription('Get a random emoji'),
  cooldown: 3,
  aliases: ['emoji'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const emoji = emojis[Math.floor(Math.random() * emojis.length)];

            const embed = successEmbed('Random Emoji')
              .setDescription(`${emoji.emoji} **${emoji.name}**`)
              .addField('Category', emoji.category, true)
              .setColor(0xFFD700);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};