const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('updates')
    .setDescription('View bot updates'),
  cooldown: 5,
  aliases: ['update', 'whatsnew'],
  prefix: true,
  async execute(interaction) {
      try {
            const embed = new EmbedBuilder()
              .setTitle('🆕 Updates')
              .setColor(config.embedColors?.info || 0x0099ff)
              .addFields(
                { name: 'Phase 12 (Latest)', value: '• 35 new commands added\n• Text manipulation category\n• Info commands category\n• Better error handling', inline: false },
                { name: 'Recent Fixes', value: '• Fixed cooldown system\n• Improved embed styling\n• Fixed permission checks', inline: false }
              )
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};