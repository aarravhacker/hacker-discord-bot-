const { SlashCommandBuilder, PermissionFlagsBits, ActivityType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstream')
    .setDescription('Set bot to streaming status')
    .addStringOption(opt => opt.setName('text').setDescription('Stream text').setRequired(true))
    .addStringOption(opt => opt.setName('url').setDescription('Twitch URL').setRequired(true)),
  cooldown: 0,
  aliases: [],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    if (user.id !== config.ownerId) {
      return interaction.reply({ embeds: [errorEmbed('Only the bot owner can use this command.')] });
    }

    const text = interaction.options?.getString('text') || args[0];
    const url = interaction.options?.getString('url') || args[1];

    if (!text || !url) {
      return interaction.reply({ embeds: [errorEmbed('Usage: /setstream <text> <twitch url>')] });
    }

    if (!url.includes('twitch.tv')) {
      return interaction.reply({ embeds: [errorEmbed('URL must be a Twitch URL.')] });
    }

    try {
      await interaction.client.user.setActivity(text, { type: ActivityType.Streaming, url: url });
      await interaction.reply({ embeds: [successEmbed(`Streaming: **${text}**`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to set streaming status.')] });
    }
  }
};
