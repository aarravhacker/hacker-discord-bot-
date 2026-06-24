const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('Reload a command')
    .addStringOption(opt => opt.setName('command').setDescription('Command name to reload').setRequired(true)),
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
      return interaction.reply({ embeds: [errorEmbed('Please provide a command name to reload.')] });
    }

    try {
      delete require.cache[require.resolve(`../${commandName}`)];
      const command = require(`../${commandName}`);
      interaction.client.commands.set(command.data.name, command);
      await interaction.reply({ embeds: [successEmbed(`Reloaded command: **${commandName}**`)] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to reload command: ${err.message}`)] });
    }
  }
};
