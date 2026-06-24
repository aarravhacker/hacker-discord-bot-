const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timestamp')
    .setDescription('Creates a Discord timestamp from a date/time')
    .addStringOption(opt => opt.setName('datetime').setDescription('Date/time (e.g., 2024-01-01, 12:00, or relative like 1h, 30m)').setRequired(true))
    .addStringOption(opt => opt.setName('format').setDescription('Format: f, F, d, D, t, T, R').setRequired(false)),
  cooldown: 3,
  aliases: ['ts'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            let input, format;

            if (isSlash) {
              input = interaction.options?.getString('datetime');
              format = interaction.options?.getString('format') || 'f';
            } else {
              if (!args || args.length === 0) {
                return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Usage: `/timestamp <datetime> [format]`').setColor(config.embedColors.error)] });
              }
              input = args[0];
              format = args[1] || 'f';
            }

            if (!input) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Usage: `/timestamp <datetime> [format]`').setColor(config.embedColors.error)] });
            }

            let date;

            const relativeMatch = input.match(/^(-?\d+)(s|m|h|d|w|mo|y)$/);
            if (relativeMatch) {
              const amount = parseInt(relativeMatch[1]);
              const unit = relativeMatch[2];
              const now = Date.now();
              const offsets = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000, mo: 2592000000, y: 31536000000 };
              date = new Date(now + amount * (offsets[unit] || 0));
            } else {
              date = new Date(input);
            }

            if (isNaN(date.getTime())) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Invalid date/time.').setColor(config.embedColors.error)] });
            }

            const unix = Math.floor(date.getTime() / 1000);
            const validFormats = ['f', 'F', 'd', 'D', 't', 'T', 'R'];
            const fmt = validFormats.includes(format) ? format : 'f';

            const embed = new EmbedBuilder()
              .setTitle('Timestamp')
              .setColor(config.embedColors.success)
              .addFields(
                { name: 'Date', value: date.toISOString(), inline: true },
                { name: 'Unix', value: `${unix}`, inline: true },
                { name: 'Discord Format', value: `<t:${unix}:${fmt}>`, inline: true },
                { name: 'Copy Paste', value: `\`<t:${unix}:${fmt}>\``, inline: false }
              )
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
