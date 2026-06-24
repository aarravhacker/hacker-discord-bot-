const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config');
const { errorEmbed } = require('../../utils/helpers');

const genAI = config.geminiApiKey ? new GoogleGenerativeAI(config.geminiApiKey) : null;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-joke')
    .setDescription('AI tells you a joke')
    .addStringOption(opt =>
      opt.setName('topic').setDescription('Joke topic (optional)')
    ),
  cooldown: 5,
  aliases: ['joke', 'jokes', 'funny'],
  prefix: true,

  async execute(interaction, args) {
    if (!genAI) {
      return interaction.reply({ embeds: [errorEmbed('AI not configured.')] });
    }

    const topic = interaction.options?.getString('topic') || args.join(' ') || 'general';

    await interaction.deferReply();

    try {
      const model = genAI.getGenerativeModel({ model: config.aiModel });
      const result = await model.generateContent(
        `Tell me a short, funny joke about "${topic}". Keep it under 2 sentences. No explanations, just the joke.`
      );
      const joke = result.response.text();

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('AI Joke')
        .setDescription(joke)
        .setFooter({ text: `Topic: ${topic}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      return interaction.editReply({ embeds: [errorEmbed(`AI Error: ${error.message}`)] });
    }
  },
};
