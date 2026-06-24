const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hex')
    .setDescription('Shows color info from hex or RGB values')
    .addStringOption(opt => opt.setName('value').setDescription('Hex code (#FF5733) or RGB (255, 87, 51)').setRequired(true)),
  cooldown: 3,
  aliases: ['hexcolor'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            let input = isSlash ? interaction.options?.getString('value') : args?.join(' ');
            if (!input) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Please provide a hex code or RGB values.').setColor(config.embedColors.error)] });
            }

            let r, g, b, hex;

            const rgbMatch = input.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
            if (rgbMatch) {
              r = parseInt(rgbMatch[1]);
              g = parseInt(rgbMatch[2]);
              b = parseInt(rgbMatch[3]);
              if (r > 255 || g > 255 || b > 255) {
                return interaction.reply({ embeds: [new EmbedBuilder().setDescription('RGB values must be between 0-255.').setColor(config.embedColors.error)] });
              }
              hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
            } else {
              hex = input.replace('#', '').replace('0x', '');
              if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
                return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Invalid hex or RGB format.').setColor(config.embedColors.error)] });
              }
              r = parseInt(hex.substring(0, 2), 16);
              g = parseInt(hex.substring(2, 4), 16);
              b = parseInt(hex.substring(4, 6), 16);
              hex = hex.toUpperCase();
            }

            const embed = new EmbedBuilder()
              .setTitle(`Color: #${hex}`)
              .setColor(parseInt(hex, 16))
              .addFields(
                { name: 'HEX', value: `\`#${hex}\``, inline: true },
                { name: 'RGB', value: `\`rgb(${r}, ${g}, ${b})\``, inline: true },
                { name: 'Decimal', value: `\`${parseInt(hex, 16)}\``, inline: true },
                { name: 'Binary', value: `\`${r.toString(2).padStart(8, '0')} ${g.toString(2).padStart(8, '0')} ${b.toString(2).padStart(8, '0')}\``, inline: false }
              )
              .setThumbnail(`https://singlecolorimage.com/get/${hex}/200x200`)
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
