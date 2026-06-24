const { SlashCommandBuilder } = require('discord.js');
const { isSlashCommand, destroyPlayer } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Leave the voice channel'),
  cooldown: 5,
  aliases: ['disconnect'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = isSlashCommand(interaction);
    try {
      destroyPlayer(interaction.guild.id);
      await interaction.reply('👋 Left voice channel.');
    } catch (error) {
      console.error(error);
      await interaction.reply('❌ Error leaving voice channel: ' + error.message);
    }
  }
};
