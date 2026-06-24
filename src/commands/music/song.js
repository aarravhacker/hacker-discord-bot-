const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const { getShoukaku, formatDuration, isSlashCommand, getQueue } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('song')
    .setDescription('Get info about the current song'),
  cooldown: 2,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = isSlashCommand(interaction);
            const shoukaku = getShoukaku();
            if (!shoukaku) return interaction.reply({ content: '❌ Music system not connected!' });

            const player = shoukaku.players.get(interaction.guild.id);
            if (!player) return interaction.reply({ content: '❌ Nothing is playing!' });

            const queue = getQueue(interaction.guild.id);
            const track = queue.current;
            if (!track) return interaction.reply({ content: '❌ Nothing is currently playing!' });

            const embed = {
              title: '🎶 Song Info',
              color: 0x1db954,
              fields: [
                { name: 'Title', value: track.info?.title || 'Unknown', inline: true },
                { name: 'Author', value: track.info?.author || 'Unknown', inline: true },
                { name: 'Duration', value: formatDuration(track.info?.duration), inline: true },
                { name: 'URL', value: track.info?.uri || 'N/A', inline: false },
                { name: 'Source', value: 'Lavalink', inline: true },
                { name: 'ISRC', value: track.info?.isrc || 'N/A', inline: true }
              ]
            };

            if (track.info?.artworkUrl) {
              embed.thumbnail = { url: track.info.artworkUrl };
            }

            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] }).catch(() => {});
      }
  }
};