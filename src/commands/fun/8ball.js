const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const responses = [
  "It is certain.",
  "It is decidedly so.",
  "Without a doubt.",
  "Yes - definitely.",
  "You may rely on it.",
  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Yes.",
  "Signs point to yes.",
  "Reply hazy, try again.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
  "Don't count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful."
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question')
    .addStringOption(option =>
      option.setName('question').setDescription('Your question').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['8ball', 'magic8ball'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const question = interaction.options?.getString('question') || args?.join(' ');

            if (!question) {
              return interaction.reply({ embeds: [errorEmbed('Please ask a question!')] });
            }

            const response = responses[Math.floor(Math.random() * responses.length)];

            const embed = successEmbed('🎱 Magic 8-Ball')
              .addField('Question', question)
              .addField('Answer', response)
              .setColor(0x000000);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};