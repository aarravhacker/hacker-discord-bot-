const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('discord')
    .setDescription('Get the official Discord server link'),
  cooldown: 5,
  aliases: ['server', 'joinserver'],
  prefix: true,
  async execute(interaction) {
      try {
            const embed = new EmbedBuilder()
              .setTitle('🌐 Discord Server')
              .setDescription('Join our official Discord community!\n\n[Click to Join](https://discord.gg/hackerbot)')
              .setColor(config.embedColors?.info || 0x0099ff)
              .setFooter({ text: 'See you there!' });

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};