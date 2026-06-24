const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shutdown')
    .setDescription('Shutdown the bot'),
  cooldown: 0,
  aliases: [],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
      try {
            const isSlash = interaction.isChatInputCommand?.() || false;
            const user = isSlash ? interaction.user : interaction.author;
            if (user.id !== config.ownerId) {
              return interaction.reply({ embeds: [errorEmbed('Only the bot owner can use this command.')] });
            }

            await interaction.reply({ embeds: [successEmbed('Shutting down...')] });
            console.log('Bot shutdown initiated by owner.');
            process.exit(0);
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};