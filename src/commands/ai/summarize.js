const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config');
const { errorEmbed } = require('../../utils/helpers');

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-summarize')
    .setDescription('Summarize text using AI')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to summarize').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('length').setDescription('Summary length')
        .addChoices(
          { name: 'Short (1-2 sentences)', value: 'short' },
          { name: 'Medium (paragraph)', value: 'medium' },
          { name: 'Detailed (key points)', value: 'detailed' }
        )
    ),
  cooldown: 5,
  aliases: ['summarize', 'tldr', 'sumup'],
  prefix: true,

  async execute(interaction, args) {
    const text = interaction.options?.getString('text') || args.join(' ');
    const length = interaction.options?.getString('length') || 'medium';
    const isInteraction = interaction.deferReply !== undefined;

    if (!text) {
      const embed = errorEmbed('Please provide text to summarize.');
      return isInteraction ? interaction.reply({ embeds: [embed], ephemeral: true }) : interaction.reply({ embeds: [embed] });
    }

    if (!config.geminiApiKey) {
      const embed = errorEmbed('AI is not configured. Set `GEMINI_API_KEY` in `.env`.');
      return isInteraction ? interaction.reply({ embeds: [embed], ephemeral: true }) : interaction.reply({ embeds: [embed] });
    }

    if (isInteraction) {
      await interaction.deferReply();
    } else {
      await interaction.channel.sendTyping().catch(() => {});
    }

    try {
      const model = genAI.getGenerativeModel({ model: config.aiModel });
      const lengthPrompts = {
        short: 'Summarize in 1-2 concise sentences.',
        medium: 'Summarize in a clear paragraph.',
        detailed: 'Summarize with key points in bullet format.'
      };

      const result = await model.generateContent(
        `${lengthPrompts[length]} Do not add any preamble, just the summary.\n\nText:\n${text}`
      );
      const response = result.response.text();

      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('AI Summary')
        .setDescription(response.length > 4096 ? response.slice(0, 4093) + '...' : response)
        .addFields({ name: 'Original Length', value: `${text.length} characters` })
        .setFooter({ text: `Length: ${length} | Model: ${config.aiModel}` })
        .setTimestamp();

      return isInteraction ? interaction.editReply({ embeds: [embed] }) : interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[AI] Summarize error:', error);
      const errMsg = (error.message || 'Failed to get response.').slice(0, 200);
      const embed = errorEmbed('AI Error', errMsg);
      return isInteraction ? interaction.editReply({ embeds: [embed] }) : interaction.reply({ embeds: [embed] });
    }
  },
};
