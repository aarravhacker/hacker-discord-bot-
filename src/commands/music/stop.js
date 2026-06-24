const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const { isSlashCommand, destroyPlayer } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop music and clear the queue'),
  cooldown: 2,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    try {
      const isSlash = isSlashCommand(interaction);
      destroyPlayer(interaction.guild.id);
      await interaction.reply('⏹️ Music stopped and queue cleared.');
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] }).catch(() => {});
    }
  }
};
