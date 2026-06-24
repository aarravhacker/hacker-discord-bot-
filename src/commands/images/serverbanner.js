const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverbanner')
    .setDescription('Get the server banner'),
  cooldown: 3,
  aliases: ['guildbanner'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const guild = await interaction.client.guilds.fetch(interaction.guild.id, { force: true });
      if (!guild.banner) {
        return interaction.reply({ embeds: [errorEmbed('This server has no banner.')] });
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.images || '#9B59B6')
        .setTitle(`${guild.name}'s Banner`)
        .setImage(guild.bannerURL({ size: 4096 }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to get server banner.')] });
    }
  }
};
