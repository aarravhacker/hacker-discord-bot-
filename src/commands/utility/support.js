const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Shows support server and links'),
  cooldown: 5,
  aliases: ['supportserver', 'helpserver'],
  prefix: true,
  async execute(interaction) {
      try {
            const embed = new EmbedBuilder()
              .setTitle('Support')
              .setColor(config.embedColors.info)
              .setDescription('Need help? Here are some useful links!')
              .addFields(
                { name: 'Support Server', value: config.supportServer || 'Not configured', inline: true },
                { name: 'GitHub', value: config.github || 'Not configured', inline: true },
                { name: 'Documentation', value: config.docs || 'Not configured', inline: true }
              )
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};