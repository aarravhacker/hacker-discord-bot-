const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const patMessages = [
  "pats your head gently! 🐾",
  "gives you a nice pat! 💕",
  "pats you on the back! 👋",
  "pats you affectionately! 🥰",
  "gives you head pats! ✨",
  "pats you until you feel better! 🧸",
  "pats you with love! 💗",
  "gives you the best pats! 🐶"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pat')
    .setDescription('Pat a user')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to pat').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['pat'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = interaction.isChatInputCommand?.() || false;
            const user = isSlash ? interaction.user : interaction.author;
            const target = interaction.options?.getUser('user') || interaction.mentions?.users?.first();

            if (!target) {
              return interaction.reply({ embeds: [errorEmbed('Please mention a user to pat.')] });
            }

            if (target.id === user.id) {
              const embed = successEmbed('Self Pat')
                .setDescription(`*${user.username} pats themselves!* 🐾`)
                .setColor(0xFF69B4);
              return interaction.reply({ embeds: [embed] });
            }

            const message = patMessages[Math.floor(Math.random() * patMessages.length)];

            const embed = successEmbed('Pat')
              .setDescription(`**${user.username}** ${message}\n\n*To: ${target.username}*`)
              .setColor(0xFF69B4);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};