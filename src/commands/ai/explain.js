const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config');
const { errorEmbed } = require('../../utils/helpers');

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-explain')
    .setDescription('Have AI explain a concept to you')
    .addStringOption(opt =>
      opt.setName('topic').setDescription('What do you want explained?').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('level').setDescription('Explanation level')
        .addChoices(
          { name: 'Simple (5 year old)', value: 'simple' },
          { name: 'Beginner', value: 'beginner' },
          { name: 'Intermediate', value: 'intermediate' },
          { name: 'Expert', value: 'expert' }
        )
    ),
  cooldown: 5,
  aliases: ['explain', 'whatis', 'howdoes'],
  prefix: true,

  async execute(interaction, args) {
    const topic = interaction.options?.getString('topic') || args.join(' ');
    const level = interaction.options?.getString('level') || 'beginner';
    const isInteraction = interaction.deferReply !== undefined;

    if (!topic) {
      const embed = errorEmbed('Please provide a topic to explain.');
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
      const levelPrompts = {
        simple: 'Explain like talking to a 5 year old. Use simple words and fun analogies.',
        beginner: 'Explain for someone with no background knowledge. Use everyday examples.',
        intermediate: 'Explain with some technical detail but keep it accessible.',
        expert: 'Provide a deep, technical explanation with nuances and edge cases.'
      };

      const result = await model.generateContent(`${levelPrompts[level]} Topic: ${topic}`);
      const response = result.response.text();

      const levelEmoji = { simple: '👶', beginner: '📘', intermediate: '📙', expert: '🎓' };

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`Explaining: ${topic}`)
        .setDescription(response.length > 4096 ? response.slice(0, 4093) + '...' : response)
        .setFooter({ text: `${levelEmoji[level]} Level: ${level} | Model: ${config.aiModel}` })
        .setTimestamp();

      return isInteraction ? interaction.editReply({ embeds: [embed] }) : interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[AI] Explain error:', error);
      const errMsg = (error.message || 'Failed to get response.').slice(0, 200);
      const embed = errorEmbed('AI Error', errMsg);
      return isInteraction ? interaction.editReply({ embeds: [embed] }) : interaction.reply({ embeds: [embed] });
    }
  },
};
