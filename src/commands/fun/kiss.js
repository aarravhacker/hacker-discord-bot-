const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const kissMessages = [
  "gives you a sweet kiss! 💋",
  "kisses you on the cheek! 😘",
  "blows you a kiss! 💕",
  "kisses you lovingly! 💗",
  "gives you a gentle kiss! 🥰",
  "kisses you and makes your heart flutter! 💓",
  "plants a kiss on your forehead! ✨",
  "kisses you with a big smile! 😊"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kiss')
    .setDescription('Kiss a user')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to kiss').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['kiss'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = interaction.isChatInputCommand?.() || false;
            const user = isSlash ? interaction.user : interaction.author;
            const target = interaction.options?.getUser('user') || interaction.mentions?.users?.first();

            if (!target) {
              return interaction.reply({ embeds: [errorEmbed('Please mention a user to kiss.')] });
            }

            if (target.id === user.id) {
              const embed = successEmbed('Self Kiss')
                .setDescription(`*${user.username} kisses themselves!* 💋`)
                .setColor(0xFF1493);
              return interaction.reply({ embeds: [embed] });
            }

            const message = kissMessages[Math.floor(Math.random() * kissMessages.length)];

            const embed = successEmbed('Kiss')
              .setDescription(`**${user.username}** ${message}\n\n*To: ${target.username}*`)
              .setColor(0xFF1493);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};