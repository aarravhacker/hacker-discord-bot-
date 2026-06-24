const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config');
const { errorEmbed } = require('../../utils/helpers');

const genAI = config.geminiApiKey ? new GoogleGenerativeAI(config.geminiApiKey) : null;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-story')
    .setDescription('AI writes a short story')
    .addStringOption(opt =>
      opt.setName('topic').setDescription('Story topic or theme').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('style').setDescription('Story style')
        .addChoices(
          { name: 'Funny', value: 'funny' },
          { name: 'Scary', value: 'scary' },
          { name: 'Romantic', value: 'romantic' },
          { name: 'Adventure', value: 'adventure' },
          { name: 'Sci-Fi', value: 'sci-fi' }
        )
    ),
  cooldown: 10,
  aliases: ['story', 'tale'],
  prefix: true,

  async execute(interaction, args) {
    if (!genAI) {
      return interaction.reply({ embeds: [errorEmbed('AI not configured.')] });
    }

    const topic = interaction.options?.getString('topic') || args.join(' ');
    const style = interaction.options?.getString('style') || 'adventure';

    if (!topic) {
      return interaction.reply({ embeds: [errorEmbed('Please provide a topic!')] });
    }

    await interaction.deferReply();

    try {
      const model = genAI.getGenerativeModel({ model: config.aiModel });
      const result = await model.generateContent(
        `Write a short ${style} story about "${topic}". Keep it under 300 words. Make it engaging with a twist ending.`
      );
      const story = result.response.text();

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`AI Story: ${topic}`)
        .setDescription(story.length > 4096 ? story.slice(0, 4093) + '...' : story)
        .setFooter({ text: `Style: ${style}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      return interaction.editReply({ embeds: [errorEmbed(`AI Error: ${error.message}`)] });
    }
  },
};
