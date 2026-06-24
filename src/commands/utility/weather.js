const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Shows weather information for a location')
    .addStringOption(opt => opt.setName('location').setDescription('City name').setRequired(true)),
  cooldown: 10,
  aliases: ['w'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
      const location = isSlash ? interaction.options?.getString('location') : args?.join(' ');

      if (!location) {
        return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Please provide a location.').setColor(config.embedColors.error)] });
      }

      const embed = new EmbedBuilder()
        .setTitle(`Weather for ${location}`)
        .setColor(config.embedColors.info)
        .setDescription('Weather data requires an API key configuration.\nSet `WEATHER_API_KEY` in your environment to enable this feature.')
        .addFields(
          { name: 'Location', value: location, inline: true },
          { name: 'Status', value: 'API not configured', inline: true }
        )
        .setFooter({ text: 'Configure WEATHER_API_KEY to enable full weather data.' })
        .setTimestamp();

      interaction.reply({ embeds: [embed] });
    } catch (err) {
      interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] }).catch(() => {});
    }
  }
};
