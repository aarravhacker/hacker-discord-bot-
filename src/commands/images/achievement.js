const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement')
    .setDescription('Create an achievement notification')
    .addStringOption(opt => opt.setName('text').setDescription('Achievement text').setRequired(true)),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const text = interaction.options?.getString('text') || args.join(' ');
      if (!text) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /achievement <text>')] });
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.images || '#FFD700')
        .setTitle('🏆 Achievement Unlocked!')
        .setDescription(`**${text}**\n\nImage generation requires canvas library integration.`)
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to create achievement.')] });
    }
  }
};
