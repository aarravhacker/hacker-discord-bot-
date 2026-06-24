const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('enlarge')
    .setDescription('Enlarge an emoji')
    .addStringOption(option =>
      option
        .setName('emoji')
        .setDescription('The emoji to enlarge')
        .setRequired(true)
    ),

  cooldown: 5,
  aliases: ['bigemoji', 'emote'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const emoji = interaction.options.getString('emoji');

      if (!emoji) {
        return interaction.reply({
          embeds: [errorEmbed('Please provide a valid emoji.')],
          ephemeral: true
        });
      }

      const emojiRegex = /<(a?):(\w+):(\d+)>/;
      const match = emoji.match(emojiRegex);

      if (!match) {
        return interaction.reply({
          embeds: [errorEmbed('Please provide a valid custom emoji.')],
          ephemeral: true
        });
      }

      const animated = match[1] === 'a';
      const emojiName = match[2];
      const emojiId = match[3];
      const extension = animated ? 'gif' : 'png';
      const url = `https://cdn.discordapp.com/emojis/${emojiId}.${extension}?size=256`;

      const embed = infoEmbed(`**${emojiName}**`)
        .setThumbnail(url)
        .setURL(url);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in enlarge command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while enlarging the emoji.')],
        ephemeral: true
      });
    }
  }
};
