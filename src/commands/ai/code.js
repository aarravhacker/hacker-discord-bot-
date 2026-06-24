const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config');
const { errorEmbed } = require('../../utils/helpers');

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-code')
    .setDescription('Get AI help with code')
    .addStringOption(opt =>
      opt.setName('prompt').setDescription('Describe what you need help with').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('language').setDescription('Programming language (e.g. javascript, python)')
    ),
  cooldown: 5,
  aliases: ['codeai', 'aicode', 'codehelp'],
  prefix: true,

  async execute(interaction, args) {
    const prompt = interaction.options?.getString('prompt') || args.join(' ');
    const language = interaction.options?.getString('language') || '';
    const isInteraction = interaction.deferReply !== undefined;

    if (!prompt) {
      const embed = errorEmbed('Please describe what code help you need.');
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
      const sysPrompt = `You are an expert programmer. Help the user with their code question.
${language ? `Focus on ${language}.` : ''}
Provide clean, working code examples when relevant. Explain your reasoning.
If asked to write code, wrap it in triple backticks with the language name.`;

      const result = await model.generateContent(`${sysPrompt}\n\nUser: ${prompt}`);
      const response = result.response.text();

      const embed = new EmbedBuilder()
        .setColor(0x00d4aa)
        .setTitle('AI Code Assistant')
        .setDescription(response.length > 4096 ? response.slice(0, 4093) + '...' : response)
        .addFields({ name: 'Request', value: prompt.length > 256 ? prompt.slice(0, 253) + '...' : prompt })
        .setFooter({ text: `Model: ${config.aiModel}` })
        .setTimestamp();

      return isInteraction ? interaction.editReply({ embeds: [embed] }) : interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[AI] Code error:', error);
      const errMsg = (error.message || 'Failed to get response.').slice(0, 200);
      const embed = errorEmbed('AI Error', errMsg);
      return isInteraction ? interaction.editReply({ embeds: [embed] }) : interaction.reply({ embeds: [embed] });
    }
  },
};
