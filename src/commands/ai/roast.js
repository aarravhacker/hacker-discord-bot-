const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config');
const { errorEmbed } = require('../../utils/helpers');

const genAI = config.geminiApiKey ? new GoogleGenerativeAI(config.geminiApiKey) : null;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-roast')
    .setDescription('AI roasts someone')
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to roast').setRequired(true)
    ),
  cooldown: 10,
  aliases: ['roast', 'burn'],
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
        `Roast ${target.username} in a funny, playful way. Keep it under 2 sentences. Be witty, not mean. Make it Discord-friendly.`
      );
      const roast = result.response.text();

      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('AI Roast')
        .setDescription(`🔥 ${roast}`)
        .setFooter({ text: `Roasting: ${target.username}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      return interaction.editReply({ embeds: [errorEmbed(`AI Error: ${error.message}`)] });
    }
  },
};
