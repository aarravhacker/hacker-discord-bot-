const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('load')
    .setDescription('Load a command')
    .addStringOption(opt => opt.setName('command').setDescription('Command file name').setRequired(true)),
  cooldown: 0,
  aliases: [],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    if (user.id !== config.ownerId) {
      return interaction.reply({ embeds: [errorEmbed('Only the bot owner can use this command.')] });
    }

    const commandName = interaction.options?.getString('command') || args[0];
    if (!commandName) {
      return interaction.reply({ embeds: [errorEmbed('Please provide a command file name to load.')] });
    }

    try {
      const commandPath = path.join(__dirname, '..', commandName + '.js');
      if (!fs.existsSync(commandPath)) {
        return interaction.reply({ embeds: [errorEmbed(`Command file not found: ${commandName}.js`)] });
      }

      const command = require(commandPath);
      interaction.client.commands.set(command.data.name, command);
      await interaction.reply({ embeds: [successEmbed(`Loaded command: **${command.data.name}**`)] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to load command: ${err.message}`)] });
    }
  }
};
