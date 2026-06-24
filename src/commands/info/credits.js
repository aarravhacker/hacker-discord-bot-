const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('credits')
    .setDescription('View bot credits and contributors'),
  cooldown: 5,
  aliases: ['aboutdev', 'team'],
  prefix: true,
  async execute(interaction) {
      try {
            const embed = new EmbedBuilder()
              .setTitle('🏆 Credits')
              .setDescription('Meet the team behind Hacker Bot!')
              .setColor(config.embedColors?.info || 0x0099ff)
              .addFields(
                { name: 'Lead Developer', value: 'Hacker Bot Team', inline: true },
                { name: 'Contributors', value: 'Community', inline: true },
                { name: 'Special Thanks', value: 'All server admins using the bot', inline: true },
                { name: 'Libraries', value: '• discord.js\n• knex.js\n• PostgreSQL', inline: true },
                { name: 'Support Us', value: 'Vote on top.gg or invite the bot to your server!', inline: true }
              )
              .setFooter({ text: 'Thank you for using Hacker Bot!' })
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};