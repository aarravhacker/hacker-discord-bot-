const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription('About the bot'),
  cooldown: 5,
  aliases: ['aboutbot', 'whatis'],
  prefix: true,
  async execute(interaction) {
      try {
            const embed = new EmbedBuilder()
              .setTitle('About Hacker Bot')
              .setDescription('Hacker Bot is a multi-purpose Discord bot packed with moderation, utility, fun, and text manipulation commands. Built for communities that need power and flexibility.')
              .setColor(config.embedColors?.info || 0x0099ff)
              .addFields(
                { name: 'Features', value: '• Moderation tools\n• Text manipulation\n• Utility commands\n• Fun & games\n• Custom embeds\n• Auto-moderation', inline: true },
                { name: 'Developer', value: 'Hacker Bot Team', inline: true },
                { name: 'Language', value: 'JavaScript (Node.js)', inline: true }
              )
              .setFooter({ text: 'Type /help for a list of commands!' })
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};