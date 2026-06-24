const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('servericon')
    .setDescription('Get the server icon'),
  cooldown: 3,
  aliases: ['guildicon', 'icon'],
  prefix: true,
  async execute(interaction, args) {
    try {
      if (!interaction.guild.icon()) {
        return interaction.reply({ embeds: [errorEmbed('This server has no icon.')] });
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.images || '#9B59B6')
        .setTitle(`${interaction.guild.name}'s Icon`)
        .setImage(interaction.guild.iconURL({ size: 4096, dynamic: true }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to get server icon.')] });
    }
  }
};
