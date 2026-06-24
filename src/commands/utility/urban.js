const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('urban')
    .setDescription('Looks up a word on Urban Dictionary')
    .addStringOption(opt => opt.setName('word').setDescription('Word or phrase to look up').setRequired(true)),
  cooldown: 5,
  aliases: ['ud'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const word = isSlash ? interaction.options?.getString('word') : args?.join(' ');
            if (!word) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Please provide a word or phrase.').setColor(config.embedColors.error)] });
            }

            const embed = new EmbedBuilder()
              .setTitle(`Urban Dictionary: ${word}`)
              .setColor(config.embedColors.info)
              .setDescription('Urban Dictionary lookup requires an API.\nThis feature will be available when API integration is configured.')
              .addFields(
                { name: 'Search Term', value: word, inline: true },
                { name: 'Status', value: 'API not configured', inline: true }
              )
              .setFooter({ text: 'Configure URBAN_DICT_API to enable lookups.' })
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
