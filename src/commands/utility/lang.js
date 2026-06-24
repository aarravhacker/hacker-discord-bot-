const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lang')
    .setDescription('Shows supported languages for translation')
    .addStringOption(opt => opt.setName('search').setDescription('Search for a language').setRequired(false)),
  cooldown: 3,
  aliases: ['languages', 'languageslist'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const languages = {
              'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian',
              'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese',
              'ar': 'Arabic', 'hi': 'Hindi', 'tr': 'Turkish', 'pl': 'Polish', 'nl': 'Dutch',
              'sv': 'Swedish', 'da': 'Danish', 'fi': 'Finnish', 'no': 'Norwegian', 'uk': 'Ukrainian',
              'cs': 'Czech', 'el': 'Greek', 'he': 'Hebrew', 'th': 'Thai', 'vi': 'Vietnamese',
              'id': 'Indonesian', 'ms': 'Malay', 'ro': 'Romanian', 'hu': 'Hungarian', 'bg': 'Bulgarian'
            };

            const search = isSlash ? (interaction.options?.getString('search')?.toLowerCase() || null) : (args?.join(' ')?.toLowerCase() || null);
            let filtered = Object.entries(languages);

            if (search) {
              filtered = filtered.filter(([code, name]) => code.includes(search) || name.toLowerCase().includes(search));
            }

            const embed = new EmbedBuilder()
              .setTitle('Supported Languages')
              .setColor(config.embedColors.info)
              .setDescription(filtered.map(([code, name]) => `\`${code}\` - ${name}`).join('\n').substring(0, 4096))
              .setFooter({ text: `Showing ${filtered.length} languages` })
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
