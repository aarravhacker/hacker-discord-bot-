const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const { getShoukaku, formatDuration, isSlashCommand, getQueue } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('q')
    .setDescription('Show the music queue (alias)'),
  cooldown: 3,
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
            if (queue.length === 0 && !queue.current) {
              return interaction.reply({ content: '📋 The queue is empty.' });
            }

            const current = queue.current;
            let description = '';

            if (current) {
              description += `**Now Playing:** [${current.info.title}](${current.info.uri}) - ${formatDuration(current.info.duration)}\n\n`;
            }

            description += '**Queue:**\n';
            const tracks = queue.tracks;
            for (let i = 0; i < Math.min(tracks.length, 20); i++) {
              const t = tracks[i];
              description += `${i + 1}. [${t.info.title}](${t.info.uri}) - ${formatDuration(t.info.duration)}\n`;
            }
            if (tracks.length > 20) {
              description += `\n... and ${tracks.length - 20} more tracks`;
            }

            const embed = {
              title: '📋 Music Queue',
              description,
              color: 0x1db954,
              footer: { text: `${tracks.length} track(s) in queue` }
            };

            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] }).catch(() => {});
      }
  }
};