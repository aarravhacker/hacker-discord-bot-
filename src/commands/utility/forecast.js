const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('forecast')
    .setDescription('Shows weather forecast for a location')
    .addStringOption(opt => opt.setName('location').setDescription('City name').setRequired(true))
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days (1-5)').setMinValue(1).setMaxValue(5).setRequired(false)),
  cooldown: 10,
  aliases: ['fcast'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            let location, days;

            if (isSlash) {
              location = interaction.options?.getString('location');
              days = interaction.options?.getInteger('days') || 3;
            } else {
              location = args?.[0];
              days = parseInt(args?.[1]) || 3;
            }

            if (!location) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Please provide a location.').setColor(config.embedColors.error)] });
            }

            const embed = new EmbedBuilder()
              .setTitle(`${days}-Day Forecast for ${location}`)
              .setColor(config.embedColors.info)
              .setDescription('Forecast data requires an API key configuration.\nSet `WEATHER_API_KEY` in your environment to enable this feature.')
              .addFields(
                { name: 'Location', value: location, inline: true },
                { name: 'Days', value: `${days}`, inline: true },
                { name: 'Status', value: 'API not configured', inline: true }
              )
              .setFooter({ text: 'Configure WEATHER_API_KEY to enable full forecast data.' })
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
