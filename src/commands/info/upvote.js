const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('upvote')
    .setDescription('Upvote the bot on top.gg'),
  cooldown: 5,
  aliases: ['vote'],
  prefix: true,
  async execute(interaction) {
      try {
            const embed = new EmbedBuilder()
              .setTitle('⬆️ Upvote Us!')
              .setDescription('Show your support by upvoting!\n\n[Upvote on top.gg](https://top.gg/bot/your-bot-id)')
              .setColor(config.embedColors?.success || 0x00ff00)
              .setFooter({ text: 'Thank you for your support!' });

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};