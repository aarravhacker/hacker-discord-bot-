const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const triviaQuestions = [
  {
    question: "What is the capital of France?",
    options: ["London", "Paris", "Berlin", "Madrid"],
    answer: 1
  },
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    answer: 1
  },
  {
    question: "What is the largest mammal in the world?",
    options: ["Elephant", "Blue Whale", "Giraffe", "Polar Bear"],
    answer: 1
  },
  {
    question: "How many continents are there?",
    options: ["5", "6", "7", "8"],
    answer: 2
  },
  {
    question: "What is the chemical symbol for gold?",
    options: ["Ag", "Au", "Fe", "Cu"],
    answer: 1
  },
  {
    question: "Which programming language is known as the 'language of the web'?",
    options: ["Python", "Java", "JavaScript", "C++"],
    answer: 2
  },
  {
    question: "What year was Discord founded?",
    options: ["2013", "2014", "2015", "2016"],
    answer: 2
  },
  {
    question: "What is the largest ocean on Earth?",
    options: ["Atlantic", "Indian", "Arctic", "Pacific"],
    answer: 3
  },
  {
    question: "How many colors are in a rainbow?",
    options: ["5", "6", "7", "8"],
    answer: 2
  },
  {
    question: "What is the speed of light?",
    options: ["300,000 km/s", "150,000 km/s", "500,000 km/s", "1,000,000 km/s"],
    answer: 0
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Answer a trivia question'),
  cooldown: 10,
  aliases: ['trivia', 'quiz'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = interaction.isChatInputCommand?.() || false;
            const user = isSlash ? interaction.user : interaction.author;
            const questionData = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];

            const embed = successEmbed('Trivia Time!')
              .setDescription(questionData.question)
              .setColor(0x5865F2);

            const row = new ActionRowBuilder();
            const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
            const letters = ['A', 'B', 'C', 'D'];

            questionData.options.forEach((option, index) => {
              row.addComponents(
                new ButtonBuilder()
                  .setCustomId(`trivia_${index}`)
                  .setLabel(`${letters[index]}. ${option}`)
                  .setStyle(ButtonStyle.Secondary)
              );
            });

            const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

            const collector = reply.createMessageComponentCollector({
              filter: (i) => i.user.id === user.id,
              time: 30000,
              max: 1
            });

            collector.on('collect', async (i) => {
              const selectedIndex = parseInt(i.customId.split('_')[1]);
              const isCorrect = selectedIndex === questionData.answer;

              if (isCorrect) {
                const correctEmbed = successEmbed('Correct! 🎉')
                  .setDescription(`**${questionData.question}**\n\nAnswer: **${letters[questionData.answer]}. ${questionData.options[questionData.answer]}**`)
                  .setColor(0x00FF00);

                await i.update({ embeds: [correctEmbed], components: [] });
              } else {
                const wrongEmbed = errorEmbed('Wrong! ❌')
                  .setDescription(`**${questionData.question}**\n\nYour answer: ${letters[selectedIndex]}. ${questionData.options[selectedIndex]}\nCorrect answer: **${letters[questionData.answer]}. ${questionData.options[questionData.answer]}**`)
                  .setColor(0xFF0000);

                await i.update({ embeds: [wrongEmbed], components: [] });
              }
            });

            collector.on('end', (collected) => {
              if (collected.size === 0) {
                const timeoutEmbed = errorEmbed('Time\'s Up!')
                  .setDescription(`**${questionData.question}**\n\nCorrect answer: **${letters[questionData.answer]}. ${questionData.options[questionData.answer]}**`)
                  .setColor(0xFF8C00);

                interaction.editReply({ embeds: [timeoutEmbed], components: [] });
              }
            });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};