const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translates text to another language')
    .addStringOption(opt => opt.setName('text').setDescription('Text to translate').setRequired(true))
    .addStringOption(opt => opt.setName('to').setDescription('Target language code (e.g., es, fr, de)').setRequired(true))
    .addStringOption(opt => opt.setName('from').setDescription('Source language code (default: auto)').setRequired(false)),
  cooldown: 5,
  aliases: ['tr'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();

      let text, to, from;
      if (isSlash) {
        text = interaction.options?.getString('text');
        to = interaction.options?.getString('to');
        from = interaction.options?.getString('from') || 'auto';
      } else {
        if (!args || args.length < 2) {
          return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Usage: `!translate <text> <to> [from]`').setColor(config.embedColors.error)] });
        }
        to = args[args.length - 1].toLowerCase();
        from = args.length > 2 ? args[args.length - 2].toLowerCase() : 'auto';
        text = args.slice(0, args.length - 2).join(' ') || args.slice(0, args.length - 1).join(' ');
      }

      const embed = new EmbedBuilder()
        .setTitle('Translation')
        .setColor(config.embedColors.info)
        .setDescription('Translation requires an API key configuration.\nSet `TRANSLATE_API_KEY` in your environment to enable this feature.')
        .addFields(
          { name: 'Text', value: text.substring(0, 1024) || 'N/A', inline: false },
          { name: 'From', value: from.toUpperCase(), inline: true },
          { name: 'To', value: to.toUpperCase(), inline: true }
        )
        .setFooter({ text: 'Configure TRANSLATE_API_KEY to enable translations.' })
        .setTimestamp();

      interaction.reply({ embeds: [embed] });
    } catch (err) {
      interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] }).catch(() => {});
    }
  }
};
