const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

const rates = {
  USD: 1, EUR: 0.85, GBP: 0.73, JPY: 110.15, CAD: 1.25, AUD: 1.35,
  CHF: 0.92, CNY: 6.45, INR: 74.50, KRW: 1150, MXN: 20.15,
  BRL: 5.05, RUB: 74.00, SEK: 8.60, NOK: 8.50, DKK: 6.35,
  NZD: 1.42, SGD: 1.35, HKD: 7.78, TRY: 8.50, ZAR: 14.50
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('currency')
    .setDescription('Converts between currencies')
    .addStringOption(opt => opt.setName('from').setDescription('Source currency code (e.g., USD)').setRequired(true))
    .addStringOption(opt => opt.setName('to').setDescription('Target currency code (e.g., EUR)').setRequired(true))
    .addNumberOption(opt => opt.setName('amount').setDescription('Amount to convert').setRequired(true)),
  cooldown: 5,
  aliases: ['money', 'exchange'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            let amount, from, to;

            if (isSlash) {
              amount = interaction.options?.getNumber('amount');
              from = interaction.options?.getString('from')?.toUpperCase();
              to = interaction.options?.getString('to')?.toUpperCase();
            } else {
              if (!args || args.length < 3) {
                return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Usage: `/currency <amount> <from> <to>`').setColor(config.embedColors.error)] });
              }
              amount = parseFloat(args[0]);
              from = args[1].toUpperCase();
              to = args[2].toUpperCase();
            }

            if (isNaN(amount)) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Invalid amount.').setColor(config.embedColors.error)] });
            }

            if (!rates[from] || !rates[to]) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Invalid currency code. Supported: ' + Object.keys(rates).join(', ')).setColor(config.embedColors.error)] });
            }

            const result = (amount / rates[from]) * rates[to];

            const embed = new EmbedBuilder()
              .setTitle('Currency Conversion')
              .setColor(config.embedColors.success)
              .addFields(
                { name: 'Input', value: `\`${amount.toFixed(2)} ${from}\``, inline: true },
                { name: 'Result', value: `\`${result.toFixed(2)} ${to}\``, inline: true },
                { name: 'Rate', value: `\`1 ${from} = ${(rates[to] / rates[from]).toFixed(4)} ${to}\``, inline: false }
              )
              .setFooter({ text: 'Rates are approximate.' })
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
