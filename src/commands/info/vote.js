const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vote')
    .setDescription('Vote for the bot on top.gg'),
  cooldown: 5,
  aliases: ['upvote', 'voteforbot'],
  prefix: true,
  async execute(interaction) {
      try {
            const embed = new EmbedBuilder()
              .setTitle('🗳️ Vote for Us!')
              .setDescription('Support Hacker Bot by voting on top.gg!\n\n[Vote on top.gg](https://top.gg/bot/your-bot-id)')
              .setColor(config.embedColors?.success || 0x00ff00)
              .setFooter({ text: 'Every vote helps us grow!' });

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};