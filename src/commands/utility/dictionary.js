const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dictionary')
    .setDescription('Looks up a word in the dictionary')
    .addStringOption(opt => opt.setName('word').setDescription('Word to look up').setRequired(true)),
  cooldown: 5,
  aliases: ['dict', 'define', 'definition'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const word = isSlash ? interaction.options?.getString('word') : args?.[0];
            if (!word) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Please provide a word.').setColor(config.embedColors.error)] });
            }

            const embed = new EmbedBuilder()
              .setTitle(`Dictionary: ${word}`)
              .setColor(config.embedColors.info)
              .setDescription('Dictionary lookup requires an API.\nThis feature will be available when API integration is configured.')
              .addFields(
                { name: 'Word', value: word, inline: true },
                { name: 'Status', value: 'API not configured', inline: true }
              )
              .setFooter({ text: 'Configure DICT_API to enable lookups.' })
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
