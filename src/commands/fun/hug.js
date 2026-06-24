const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const hugMessages = [
  "gives you a big warm hug! 🤗",
  "hugs you tightly! You feel so loved! 💕",
  "wraps you in a cozy hug! 🧸",
  "gives you the best hug ever! ✨",
  "squeezes you in a tight hug! 💗",
  "envelops you in a warm embrace! 🤗",
  "gives you a group hug! 🎉",
  "hugs you and makes everything better! 💖"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hug')
    .setDescription('Hug a user')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to hug').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['hug'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = interaction.isChatInputCommand?.() || false;
            const user = isSlash ? interaction.user : interaction.author;
            const target = interaction.options?.getUser('user') || interaction.mentions?.users?.first();

            if (!target) {
              return interaction.reply({ embeds: [errorEmbed('Please mention a user to hug.')] });
            }

            if (target.id === user.id) {
              const embed = successEmbed('Self Hug')
                .setDescription(`*${user.username} hugs themselves!* 🤗`)
                .setColor(0xFF69B4);
              return interaction.reply({ embeds: [embed] });
            }

            const message = hugMessages[Math.floor(Math.random() * hugMessages.length)];

            const embed = successEmbed('Hug')
              .setDescription(`**${user.username}** ${message}\n\n*To: ${target.username}*`)
              .setColor(0xFF69B4);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};