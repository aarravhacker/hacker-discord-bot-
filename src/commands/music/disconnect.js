const { SlashCommandBuilder } = require('discord.js');
const { isSlashCommand, destroyPlayer } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Disconnect from voice channel (alias)'),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = isSlashCommand(interaction);
    try {
      destroyPlayer(interaction.guild.id);
      await interaction.reply('👋 Disconnected from voice channel.');
    } catch (error) {
      console.error(error);
      await interaction.reply('❌ Error disconnecting: ' + error.message);
    }
  }
};
