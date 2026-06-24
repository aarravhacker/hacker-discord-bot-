const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

const conversions = {
  'km-miles': v => v * 0.621371,
  'miles-km': v => v * 1.60934,
  'kg-lbs': v => v * 2.20462,
  'lbs-kg': v => v * 0.453592,
  'celsius-fahrenheit': v => (v * 9 / 5) + 32,
  'fahrenheit-celsius': v => (v - 32) * 5 / 9,
  'cm-inches': v => v * 0.393701,
  'inches-cm': v => v * 2.54,
  'meters-feet': v => v * 3.28084,
  'feet-meters': v => v * 0.3048,
  'liters-gallons': v => v * 0.264172,
  'gallons-liters': v => v * 3.78541,
  'gb-mb': v => v * 1024,
  'mb-gb': v => v / 1024
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('convert')
    .setDescription('Converts between units')
    .addStringOption(opt => opt.setName('from').setDescription('Source unit (e.g., km, miles, celsius)').setRequired(true))
    .addStringOption(opt => opt.setName('to').setDescription('Target unit (e.g., miles, km, fahrenheit)').setRequired(true))
    .addNumberOption(opt => opt.setName('value').setDescription('Value to convert').setRequired(true)),
  cooldown: 3,
  aliases: ['unit'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            let value, from, to;

            if (isSlash) {
              value = interaction.options?.getNumber('value');
              from = interaction.options?.getString('from')?.toLowerCase();
              to = interaction.options?.getString('to')?.toLowerCase();
            } else {
              if (!args || args.length < 3) {
                return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Usage: `/convert <value> <from> <to>`').setColor(config.embedColors.error)] });
              }
              value = parseFloat(args[0]);
              from = args[1].toLowerCase();
              to = args[2].toLowerCase();
            }

            const key = `${from}-${to}`;

            if (isNaN(value)) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Invalid number.').setColor(config.embedColors.error)] });
            }

            if (!conversions[key]) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription(`Conversion \`${from}\` to \`${to}\` not supported.`).setColor(config.embedColors.error)] });
            }

            const result = conversions[key](value);

            const embed = new EmbedBuilder()
              .setTitle('Unit Conversion')
              .setColor(config.embedColors.success)
              .addFields(
                { name: 'Input', value: `\`${value} ${from}\``, inline: true },
                { name: 'Result', value: `\`${result.toFixed(4)} ${to}\``, inline: true }
              )
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
