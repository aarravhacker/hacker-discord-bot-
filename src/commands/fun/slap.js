const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const slapMessages = [
  "slaps you across the face! 👋",
  "gives you a big slap! 💥",
  "slaps you so hard you see stars! ⭐",
  "slaps you into next week! 🗓️",
  "gives you a slap you won't forget! 👋",
  "slaps you with the force of a thousand winds! 🌪️",
  "slaps you so hard your shoes come off! 👟",
  "slaps you back to reality! 🎤"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slap')
    .setDescription('Slap a user (for fun!)')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to slap').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['slap'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = interaction.isChatInputCommand?.() || false;
            const user = isSlash ? interaction.user : interaction.author;
            const target = interaction.options?.getUser('user') || interaction.mentions?.users?.first();

            if (!target) {
              return interaction.reply({ embeds: [errorEmbed('Please mention a user to slap.')] });
            }

            if (target.id === user.id) {
              const embed = successEmbed('Self Slap')
                .setDescription(`*${user.username} slaps themselves!* 👋`)
                .setColor(0xFF0000);
              return interaction.reply({ embeds: [embed] });
            }

            const message = slapMessages[Math.floor(Math.random() * slapMessages.length)];

            const embed = successEmbed('Slap')
              .setDescription(`**${user.username}** ${message}\n\n*To: ${target.username}*`)
              .setColor(0xFF0000);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};