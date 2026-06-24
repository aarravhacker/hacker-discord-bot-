const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('makeembed')
    .setDescription('Create a fully custom embed')
    .addStringOption(opt =>
      opt.setName('title').setDescription('Embed title').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('description').setDescription('Embed description').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('color').setDescription('Hex color (e.g. ff0000)').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('author').setDescription('Author name').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('footer').setDescription('Footer text').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('image').setDescription('Image URL').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('thumbnail').setDescription('Thumbnail URL').setRequired(false)
    ),
  cooldown: 5,
  aliases: ['customembed', 'ce'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const getArg = (name) => interaction.options?.getString(name);
            const title = getArg('title');
            const description = getArg('description') || args?.join(' ');
            const color = getArg('color');
            const author = getArg('author');
            const footer = getArg('footer');
            const image = getArg('image');
            const thumbnail = getArg('thumbnail');

            if (!description) {
              return interaction.reply({ embeds: [createEmbed('⚠️ Please provide a description.', 'warning')] });
            }

            const embed = new EmbedBuilder()
              .setDescription(description)
              .setColor(color ? parseInt(color.replace('#', ''), 16) : 0x00ff00);

            if (title) embed.setTitle(title);
            if (author) embed.setAuthor({ name: author });
            if (footer) embed.setFooter({ text: footer });
            if (image) embed.setImage(image);
            if (thumbnail) embed.setThumbnail(thumbnail);

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};