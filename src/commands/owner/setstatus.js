const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstatus')
    .setDescription('Set bot status')
    .addStringOption(opt => opt.setName('status').setDescription('Status: online, idle, dnd, invisible').setRequired(true)),
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

    const status = interaction.options?.getString('status') || args[0];
    if (!status || !['online', 'idle', 'dnd', 'invisible'].includes(status)) {
      return interaction.reply({ embeds: [errorEmbed('Usage: /setstatus <online|idle|dnd|invisible>')] });
    }

    try {
      await interaction.client.user.setStatus(status);
      await interaction.reply({ embeds: [successEmbed(`Status set to **${status}**.`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to set status.')] });
    }
  }
};
