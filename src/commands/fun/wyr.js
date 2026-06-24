const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const questions = [
  "Would you rather have a rewind button or a pause button for your life?",
  "Would you rather be able to fly or be invisible?",
  "Would you rather always be 10 minutes late or always be 20 minutes early?",
  "Would you rather have unlimited money or unlimited love?",
  "Would you rather be famous or be the best friend of someone famous?",
  "Would you rather live in a world without music or without movies?",
  "Would you rather never use social media again or never watch another movie?",
  "Would you rather be able to talk to animals or speak every human language?",
  "Would you rather live without air conditioning or without heating?",
  "Would you rather always be hot or always be cold?"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wyr')
    .setDescription('Would you rather? (short version)'),
  cooldown: 5,
  aliases: ['wyr'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const question = questions[Math.floor(Math.random() * questions.length)];

            const embed = successEmbed('Would You Rather?')
              .setDescription(question)
              .setColor(0x9B59B6);

            const reply = await interaction.reply({ embeds: [embed], fetchReply: true });
            await reply.react('👍');
            await reply.react('👎');
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};