const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Get support server link'),
  cooldown: 5,
  aliases: ['helpserver', 'supportserver'],
  prefix: true,
  async execute(interaction) {
      try {
            const embed = new EmbedBuilder()
              .setTitle('🛟 Support')
              .setDescription('Need help? Join our support server!\n\n[Join Support Server](https://discord.gg/hackerbot)')
              .setColor(config.embedColors?.info || 0x0099ff)
              .setFooter({ text: 'We are happy to help!' });

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};