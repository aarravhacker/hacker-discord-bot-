const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('color')
    .setDescription('Shows a color preview from hex code')
    .addStringOption(opt => opt.setName('hex').setDescription('Hex color code (e.g., #FF5733)').setRequired(true)),
  cooldown: 3,
  aliases: ['colour', 'colourpreview'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            let hex = isSlash ? interaction.options?.getString('hex') : args?.[0];
            if (!hex) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Please provide a hex color code.').setColor(config.embedColors.error)] });
            }

            hex = hex.replace('#', '');
            if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Invalid hex color code.').setColor(config.embedColors.error)] });
            }

            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);

            const embed = new EmbedBuilder()
              .setTitle(`Color: #${hex}`)
              .setColor(parseInt(hex, 16))
              .addFields(
                { name: 'HEX', value: `\`#${hex}\``, inline: true },
                { name: 'RGB', value: `\`rgb(${r}, ${g}, ${b})\``, inline: true },
                { name: 'HSL', value: `\`hsl(${Math.round((Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI + 360) % 360)}, ${Math.round((1 - Math.abs(2 * ((r + g + b) / 3) / 255 - 1)) * 100)}%, ${Math.round(((r + g + b) / 3 / 255) * 100)}%)\``, inline: true }
              )
              .setThumbnail(`https://singlecolorimage.com/get/${hex}/200x200`)
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
