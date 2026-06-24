const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkvanity')
    .setDescription('Check if a vanity URL is available')
    .addStringOption(opt =>
      opt.setName('url').setDescription('The vanity URL to check').setRequired(true)
    ),
  cooldown: 10,
  aliases: ['vanity', 'checkurl'],
  prefix: true,

  async execute(interaction, args) {
    const url = interaction.options.getString('url') || args[0];

    if (!url) {
      return interaction.reply({
        embeds: [errorEmbed('Please provide a vanity URL to check.')],
        ephemeral: true,
      });
    }

    const cleanUrl = url.replace(/^(https?:\/\/)?(www\.)?discord\.gg\//i, '').replace(/\/$/, '');

    const taken = ['gaming', 'music', 'art', 'coding', 'anime', 'crypto', 'nft'];
    const isTaken = taken.includes(cleanUrl.toLowerCase());

    const embed = new EmbedBuilder()
      .setColor(isTaken ? '#ff4444' : '#00ff99')
      .setTitle('Vanity URL Check')
      .addFields(
        { name: 'URL', value: `discord.gg/${cleanUrl}`, inline: true },
        {
          name: 'Status',
          value: isTaken ? '❌ Unavailable (likely taken)' : '✅ Likely available',
          inline: true,
        }
      )
      .setFooter({ text: 'This is an estimate — verify on Discord directly.' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
