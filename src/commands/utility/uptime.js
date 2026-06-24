const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { formatDuration, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Shows how long the bot has been running'),
  cooldown: 3,
  aliases: ['up'],
  prefix: true,
  async execute(interaction) {
      try {
            const uptime = formatDuration(interaction.client.uptime);

            const embed = new EmbedBuilder()
              .setTitle('Uptime')
              .setColor(config.embedColors.success)
              .setDescription(`I have been online for **${uptime}**.`)
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};