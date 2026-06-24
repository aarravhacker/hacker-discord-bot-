const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config');
const { errorEmbed } = require('../../utils/helpers');

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-imagine')
    .setDescription('Generate a detailed AI image prompt from a idea')
    .addStringOption(opt =>
      opt.setName('idea').setDescription('Describe your image idea').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('style').setDescription('Art style')
        .addChoices(
          { name: 'Realistic', value: 'realistic' },
          { name: 'Anime', value: 'anime' },
          { name: 'Oil Painting', value: 'oil painting' },
          { name: 'Digital Art', value: 'digital art' },
          { name: 'Pixel Art', value: 'pixel art' },
          { name: '3D Render', value: '3D render' },
          { name: 'Watercolor', value: 'watercolor' }
        )
    ),
  cooldown: 5,
  aliases: ['imagine', 'imgprompt', 'aiprompt'],
  prefix: true,

  async execute(interaction, args) {
    const idea = interaction.options?.getString('idea') || args.join(' ');
    const style = interaction.options?.getString('style') || 'digital art';
    const isInteraction = interaction.deferReply !== undefined;

    if (!idea) {
      const embed = errorEmbed('Please describe your image idea.');
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
      const result = await model.generateContent(
        `Generate a detailed, vivid image prompt for AI image generators based on this idea: "${idea}"
Style: ${style}

Requirements:
- Be highly descriptive and specific
- Include composition details (lighting, angle, mood)
- Mention color palette
- Add artistic details that make the image striking
- Output ONLY the prompt text, nothing else`
      );
      const prompt = result.response.text();

      const embed = new EmbedBuilder()
        .setColor(0xe91e63)
        .setTitle('AI Image Prompt')
        .setDescription(prompt.length > 4096 ? prompt.slice(0, 4093) + '...' : prompt)
        .addFields(
          { name: 'Your Idea', value: idea.length > 256 ? idea.slice(0, 253) + '...' : idea },
          { name: 'Style', value: style, inline: true }
        )
        .setFooter({ text: `Model: ${config.aiModel} | Use this prompt in Midjourney, DALL-E, or Stable Diffusion` })
        .setTimestamp();

      return isInteraction ? interaction.editReply({ embeds: [embed] }) : interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[AI] Imagine error:', error);
      const errMsg = (error.message || 'Failed to get response.').slice(0, 200);
      const embed = errorEmbed('AI Error', errMsg);
      return isInteraction ? interaction.editReply({ embeds: [embed] }) : interaction.reply({ embeds: [embed] });
    }
  },
};
