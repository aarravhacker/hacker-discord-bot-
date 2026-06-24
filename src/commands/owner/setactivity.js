const { SlashCommandBuilder, PermissionFlagsBits, ActivityType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setactivity')
    .setDescription('Set bot activity')
    .addStringOption(opt => opt.setName('type').setDescription('Activity type: playing, watching, listening, competing').setRequired(true))
    .addStringOption(opt => opt.setName('text').setDescription('Activity text').setRequired(true)),
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

    const typeStr = interaction.options?.getString('type') || args[0];
    const text = interaction.options?.getString('text') || args.slice(1).join(' ');

    if (!typeStr || !text) {
      return interaction.reply({ embeds: [errorEmbed('Usage: /setactivity <playing|watching|listening|competing> <text>')] });
    }

    const typeMap = {
      playing: ActivityType.Playing,
      watching: ActivityType.Watching,
      listening: ActivityType.Listening,
      competing: ActivityType.Competing
    };

    const activityType = typeMap[typeStr.toLowerCase()];
    if (!activityType) {
      return interaction.reply({ embeds: [errorEmbed('Invalid activity type. Use: playing, watching, listening, competing')] });
    }

    try {
      await interaction.client.user.setActivity(text, { type: activityType });
      await interaction.reply({ embeds: [successEmbed(`Activity set to **${typeStr}** ${text}`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to set activity.')] });
    }
  }
};
