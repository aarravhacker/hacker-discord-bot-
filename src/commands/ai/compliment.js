const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config');
const { errorEmbed } = require('../../utils/helpers');

const genAI = config.geminiApiKey ? new GoogleGenerativeAI(config.geminiApiKey) : null;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-compliment')
    .setDescription('AI compliments someone')
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to compliment').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['compliment', 'praise'],
  prefix: true,

  async execute(interaction, args) {
    if (!genAI) {
      return interaction.reply({ embeds: [errorEmbed('AI not configured.')] });
    }

    const target = interaction.options?.getUser('user') ||
      (args[0] ? interaction.guild?.members?.cache?.get(args[0]?.replace(/[<@!>]/g, ''))?.user : null) ||
      interaction.author;

    await interaction.deferReply();

    try {
      const model = genAI.getGenerativeModel({ model: config.aiModel });
      const result = await model.generateContent(
        `Give ${target.username} a wholesome, heartfelt compliment. Keep it under 2 sentences. Be genuine and sweet.`
      );
      const compliment = result.response.text();

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('AI Compliment')
        .setDescription(`💖 ${compliment}`)
        .setFooter({ text: `For: ${target.username}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      return interaction.editReply({ embeds: [errorEmbed(`AI Error: ${error.message}`)] });
    }
  },
};
