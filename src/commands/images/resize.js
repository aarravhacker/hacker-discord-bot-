const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resize')
    .setDescription('Resize an image')
    .addAttachmentOption(opt => opt.setName('image').setDescription('Image to resize').setRequired(true))
    .addIntegerOption(opt => opt.setName('width').setDescription('New width').setRequired(true))
    .addIntegerOption(opt => opt.setName('height').setDescription('New height').setRequired(true)),
  cooldown: 5,
  aliases: ['scale'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
      const attachment = interaction.options?.getAttachment('image') || (args[0] ? { url: args[0] } : null);
      const width = interaction.options?.getInteger('width') || parseInt(args[1]);
      const height = interaction.options?.getInteger('height') || parseInt(args[2]);

      if (!attachment || !width || !height) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /resize <image> <width> <height>')] });
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.images || '#9B59B6')
        .setTitle('Resize Effect')
        .setDescription(`Resizing to ${width}x${height}.\nImage manipulation requires canvas/sharp library integration.`)
        .setImage(attachment.url)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to resize image.')] });
    }
  }
};
