const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unload')
    .setDescription('Unload a command')
    .addStringOption(opt => opt.setName('command').setDescription('Command name to unload').setRequired(true)),
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

            const commandName = interaction.options?.getString('command') || args[0];
            if (!commandName) {
              return interaction.reply({ embeds: [errorEmbed('Please provide a command name to unload.')] });
            }

            const command = interaction.client.commands.get(commandName);
            if (!command) {
              return interaction.reply({ embeds: [errorEmbed(`Command not found: ${commandName}`)] });
            }

            interaction.client.commands.delete(commandName);
            await interaction.reply({ embeds: [successEmbed(`Unloaded command: **${commandName}**`)] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};