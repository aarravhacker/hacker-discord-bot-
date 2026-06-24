const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config');
const { errorEmbed } = require('../../utils/helpers');

const genAI = config.geminiApiKey ? new GoogleGenerativeAI(config.geminiApiKey) : null;

const LANGUAGES = [
  { name: 'Hindi', value: 'hindi' },
  { name: 'Spanish', value: 'spanish' },
  { name: 'French', value: 'french' },
  { name: 'German', value: 'german' },
  { name: 'Japanese', value: 'japanese' },
  { name: 'Korean', value: 'korean' },
  { name: 'Chinese', value: 'chinese' },
  { name: 'Arabic', value: 'arabic' },
  { name: 'Portuguese', value: 'portuguese' },
  { name: 'Russian', value: 'russian' },
  { name: 'Italian', value: 'italian' },
  { name: 'Turkish', value: 'turkish' },
  { name: 'Thai', value: 'thai' },
  { name: 'Vietnamese', value: 'vietnamese' },
  { name: 'Bengali', value: 'bengali' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-translate')
    .setDescription('Translate text using AI')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to translate').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('language').setDescription('Target language').setRequired(true)
        .addChoices(...LANGUAGES)
    ),
  cooldown: 5,
  aliases: ['translate', 'tr'],
  prefix: true,

  async execute(interaction, args) {
    if (!genAI) {
      return interaction.reply({ embeds: [errorEmbed('AI not configured.')] });
    }

    let text, language;

    if (interaction.options) {
      text = interaction.options.getString('text');
      language = interaction.options.getString('language');
    } else {
      const langKeywords = LANGUAGES.map(l => l.value);
      const foundLang = args.find(a => langKeywords.includes(a.toLowerCase()));
      language = foundLang || 'hindi';
      text = args.filter(a => a.toLowerCase() !== language.toLowerCase()).join(' ');
    }

    if (!text) {
      return interaction.reply({ embeds: [errorEmbed('Please provide text to translate!')] });
    }

    await interaction.deferReply();

    try {
      const model = genAI.getGenerativeModel({ model: config.aiModel });
      const result = await model.generateContent(
        `Translate the following text to ${language}. Only return the translation, nothing else.\n\nText: ${text}`
      );
      const translated = result.response.text();

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('AI Translation')
        .addFields(
          { name: 'Original', value: text.length > 256 ? text.slice(0, 253) + '...' : text },
          { name: `Translated (${language})`, value: translated.length > 256 ? translated.slice(0, 253) + '...' : translated }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      return interaction.editReply({ embeds: [errorEmbed(`AI Error: ${error.message}`)] });
    }
  },
};
