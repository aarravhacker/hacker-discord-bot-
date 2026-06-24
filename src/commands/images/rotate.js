const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotate')
    .setDescription('Rotate an image')
    .addAttachmentOption(opt => opt.setName('image').setDescription('Image to rotate').setRequired(true))
    .addIntegerOption(opt => opt.setName('degrees').setDescription('Degrees to rotate').setRequired(false)),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    try {
      const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
      const attachment = interaction.options?.getAttachment('image') || (args[0] ? { url: args[0] } : null);
      const degrees = interaction.options?.getInteger('degrees') || parseInt(args[1]) || 90;

      if (!attachment) {
        return interaction.reply({ embeds: [errorEmbed('Please provide an image.')] });
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.images || '#9B59B6')
        .setTitle('Rotate Effect')
        .setDescription(`Rotating ${degrees} degrees.\nImage manipulation requires canvas/sharp library integration.`)
        .setImage(attachment.url)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to rotate image.')] });
    }
  }
};
