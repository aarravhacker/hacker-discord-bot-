const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

const timezones = {
  EST: -5, CST: -6, MST: -7, PST: -8, GMT: 0, UTC: 0,
  CET: 1, EET: 2, IST: 5.5, JST: 9, AEST: 10, AEDT: 11,
  NZST: 12, NZDT: 13, 'America/New_York': -5, 'America/Chicago': -6,
  'America/Denver': -7, 'America/Los_Angeles': -8, 'Europe/London': 0,
  'Europe/Paris': 1, 'Europe/Berlin': 1, 'Asia/Tokyo': 9,
  'Asia/Shanghai': 8, 'Asia/Kolkata': 5.5, 'Australia/Sydney': 10,
  'Pacific/Auckland': 12
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('time')
    .setDescription('Shows the current time in a timezone')
    .addStringOption(opt => opt.setName('timezone').setDescription('Timezone (e.g., EST, UTC, America/New_York)').setRequired(false)),
  cooldown: 3,
  aliases: ['clock', 'tz'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const tz = ((isSlash ? interaction.options?.getString('timezone') : args?.[0]) || 'UTC').toUpperCase();
            const offset = timezones[tz] ?? timezones[Object.keys(timezones).find(k => k.toUpperCase() === tz)];

            if (offset === undefined) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Unknown timezone. Supported: ' + Object.keys(timezones).slice(0, 15).join(', ')).setColor(config.embedColors.error)] });
            }

            const now = new Date();
            const utc = now.getTime() + now.getTimezoneOffset() * 60000;
            const tzTime = new Date(utc + offset * 3600000);

            const embed = new EmbedBuilder()
              .setTitle('Current Time')
              .setColor(config.embedColors.info)
              .addFields(
                { name: 'Timezone', value: tz, inline: true },
                { name: 'Time', value: tzTime.toLocaleTimeString(), inline: true },
                { name: 'Date', value: tzTime.toLocaleDateString(), inline: true }
              )
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
