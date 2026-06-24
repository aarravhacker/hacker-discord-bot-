const { SlashCommandBuilder } = require('discord.js');
const { isSlashCommand, getMember, joinVoiceChannel } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join your voice channel'),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = isSlashCommand(interaction);
    const member = getMember(interaction, isSlash);
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply({ content: 'You must be in a voice channel!' });
    }

    try {
      await joinVoiceChannel(interaction.guild, voiceChannel);
      await interaction.reply(`Joined <#${voiceChannel.id}>`);
    } catch (error) {
      console.error(error);
      await interaction.reply('Error joining voice channel: ' + error.message);
    }
  }
};
