const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('brighten')
    .setDescription('Brighten an image')
    .addAttachmentOption(opt => opt.setName('image').setDescription('Image to brighten').setRequired(true)),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    try {
      const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
      const attachment = interaction.options?.getAttachment('image') || (args[0] ? { url: args[0] } : null);
      if (!attachment) {
        return interaction.reply({ embeds: [errorEmbed('Please provide an image to brighten.')] });
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.images || '#9B59B6')
        .setTitle('Brighten Effect')
        .setDescription('Image manipulation requires canvas/sharp library integration.')
        .setImage(attachment.url)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to brighten image.')] });
    }
  }
};
