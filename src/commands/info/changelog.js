const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('changelog')
    .setDescription('View the latest changelog'),
  cooldown: 5,
  aliases: ['updates', 'patchnotes'],
  prefix: true,
  async execute(interaction) {
      try {
            const embed = new EmbedBuilder()
              .setTitle('📝 Changelog')
              .setColor(config.embedColors?.info || 0x0099ff)
              .addFields(
                { name: 'v12.0.0 - Phase 12', value: '• Added 35 new text & info commands\n• Text manipulation commands\n• Bot info commands\n• Improved performance', inline: false },
                { name: 'v11.0.0 - Phase 11', value: '• Added utility commands\n• Improved moderation', inline: false },
                { name: 'v10.0.0 - Phase 10', value: '• Added fun commands\n• Bug fixes', inline: false }
              )
              .setFooter({ text: 'Type /version for more info' })
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};