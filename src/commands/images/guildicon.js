const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guildicon')
    .setDescription('Get guild icon (alias)'),
  cooldown: 3,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            const parentCommand = require('./servericon');
            return parentCommand.execute(interaction, args);
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};