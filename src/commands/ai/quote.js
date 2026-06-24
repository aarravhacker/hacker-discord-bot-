const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config');
const { errorEmbed } = require('../../utils/helpers');

const genAI = config.geminiApiKey ? new GoogleGenerativeAI(config.geminiApiKey) : null;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-quote')
    .setDescription('AI generates an inspiring quote')
    .addStringOption(opt =>
      opt.setName('topic').setDescription('Quote topic (life, love, success, etc)')
    ),
  cooldown: 5,
  aliases: ['quote', 'inspire', 'wisdom'],
  prefix: true,

  async execute(interaction, args) {
    if (!genAI) {
      return interaction.reply({ embeds: [errorEmbed('AI not configured.')] });
    }

    const topic = interaction.options?.getString('topic') || args.join(' ') || 'life';

    await interaction.deferReply();

    try {
      const model = genAI.getGenerativeModel({ model: config.aiModel });
      const result = await model.generateContent(
        `Generate a unique, inspiring quote about "${topic}". Make it profound and memorable. Include who it's attributed to if it's a famous one, or make it original.`
      );
      const quote = result.response.text();

      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('AI Quote')
        .setDescription(`*"${quote}"*`)
        .setFooter({ text: `Topic: ${topic}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      return interaction.editReply({ embeds: [errorEmbed(`AI Error: ${error.message}`)] });
    }
  },
};
