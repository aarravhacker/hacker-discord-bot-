const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('date')
    .setDescription('Shows the current date or converts a timestamp to a date')
    .addStringOption(opt => opt.setName('timestamp').setDescription('Unix timestamp or ISO date to convert').setRequired(false)),
  cooldown: 3,
  aliases: ['today', 'cal'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const now = new Date();

            const timestampArg = isSlash ? interaction.options?.getString('timestamp') : (args && args.length > 0 ? args[0] : null);

            if (timestampArg) {
              let date;

              if (/^\d+$/.test(timestampArg)) {
                date = new Date(parseInt(timestampArg) * 1000);
              } else {
                date = new Date(timestampArg);
              }

              if (isNaN(date.getTime())) {
                return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Invalid date or timestamp.').setColor(config.embedColors.error)] });
              }

              const embed = new EmbedBuilder()
                .setTitle('Date Info')
                .setColor(config.embedColors.info)
                .addFields(
                  { name: 'Date', value: date.toDateString(), inline: true },
                  { name: 'Time', value: date.toTimeString(), inline: true },
                  { name: 'ISO', value: date.toISOString(), inline: true },
                  { name: 'Unix', value: `${Math.floor(date.getTime() / 1000)}`, inline: true }
                )
                .setTimestamp();

              return interaction.reply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
              .setTitle('Today\'s Date')
              .setColor(config.embedColors.info)
              .addFields(
                { name: 'Date', value: now.toDateString(), inline: true },
                { name: 'Time', value: now.toTimeString(), inline: true },
                { name: 'ISO', value: now.toISOString(), inline: true },
                { name: 'Unix', value: `${Math.floor(now.getTime() / 1000)}`, inline: true },
                { name: 'Day of Year', value: `${Math.ceil((now - new Date(now.getFullYear(), 0, 1)) / 86400000)}`, inline: true },
                { name: 'Week', value: `${Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7)}`, inline: true }
              )
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
