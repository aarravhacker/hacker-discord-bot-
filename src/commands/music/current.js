const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const { getShoukaku, formatDuration, isSlashCommand, getQueue } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('current')
    .setDescription('Show the currently playing song (alias)'),
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

            const position = player.position || 0;
            const duration = track.info?.duration || 0;
            const barLength = 20;
            const progress = duration > 0 ? Math.round((position / duration) * barLength) : 0;
            const bar = '🟩'.repeat(progress) + '⬜'.repeat(barLength - progress);

            const embed = {
              title: '🎵 Now Playing',
              description: `[${track.info?.title || 'Unknown'}](${track.info?.uri || ''})`,
              color: 0x1db954,
              fields: [
                { name: 'Duration', value: `${formatDuration(position)} / ${formatDuration(duration)}`, inline: true },
                { name: 'Author', value: track.info?.author || 'Unknown', inline: true },
                { name: 'Progress', value: bar, inline: false }
              ]
            };

            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] }).catch(() => {});
      }
  }
};