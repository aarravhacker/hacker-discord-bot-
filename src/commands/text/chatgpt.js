const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config');
const { errorEmbed } = require('../../utils/helpers');

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chat')
    .setDescription('Chat with AI powered by Gemini')
    .addStringOption(opt =>
      opt.setName('prompt').setDescription('Your message').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['chatgpt', 'gpt', 'ai'],
  prefix: true,

  async execute(interaction, args) {
    const prompt = interaction.options?.getString('prompt') || args.join(' ');

    if (!prompt) {
      const embed = errorEmbed('Please provide a message.');
      return interaction.reply ? interaction.reply({ embeds: [embed], ephemeral: true }) : interaction.channel.send({ embeds: [embed] });
    }

    if (!config.geminiApiKey) {
      const embed = errorEmbed('AI is not configured. Set `GEMINI_API_KEY` in `.env`.');
      return interaction.reply ? interaction.reply({ embeds: [embed], ephemeral: true }) : interaction.channel.send({ embeds: [embed] });
    }

    const isInteraction = interaction.deferReply !== undefined;

    if (isInteraction) {
      await interaction.deferReply();
    } else {
      await interaction.channel.sendTyping().catch(() => {});
    }

    try {
      const model = genAI.getGenerativeModel({ model: config.aiModel });
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      const embed = new EmbedBuilder()
        .setColor(0x4285f4)
        .setTitle('AI Chat')
        .setDescription(response.length > 4096 ? response.slice(0, 4093) + '...' : response)
        .addFields(
          { name: 'Your Message', value: prompt.length > 1024 ? prompt.slice(0, 1021) + '...' : prompt }
        )
        .setFooter({ text: `Model: ${config.aiModel}` })
        .setTimestamp();

      if (isInteraction) {
        return interaction.editReply({ embeds: [embed] });
      } else {
        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('[AI] Chat error:', error);
      const errMsg = (error.message || 'Failed to get response.').slice(0, 200);
      const embed = errorEmbed('AI Error', errMsg);
      if (isInteraction) {
        return interaction.editReply({ embeds: [embed] });
      } else {
        return interaction.reply({ embeds: [embed] });
      }
    }
  },
};
