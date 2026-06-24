const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { infoEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playerinfo')
        .setDescription('Show current player status'),
    cooldown: 5,
    aliases: ['pi', 'status'],
    prefix: true,
    async execute(interaction, args) {
        try {
            const player = musicManager.getPlayer(interaction.guild.id);
            if (!player) {
                return interaction.reply({
                    embeds: [errorEmbed('No active player in this guild.')],
                    ephemeral: true
                });
            }

            const track = player.currentTrack;
            const queue = await musicManager.getQueue(interaction.guild.id);

            const embed = infoEmbed('Player Info')
                .addFields(
                    { name: 'Status', value: player.playing ? 'Playing' : 'Paused', inline: true },
                    { name: 'Volume', value: `${player.volume}%`, inline: true },
                    { name: 'Queue', value: `${queue.length} tracks`, inline: true },
                    { name: '24/7', value: player.twentyFourSeven ? 'On' : 'Off', inline: true },
                    { name: 'Autoplay', value: player.autoplay ? 'On' : 'Off', inline: true },
                    { name: 'Filters', value: player.filters?.length ? player.filters.join(', ') : 'None', inline: true }
                );

            if (track) {
                embed.addFields(
                    { name: 'Now Playing', value: `**${track.title}** by ${track.author || 'Unknown'}`, inline: false },
                    { name: 'Duration', value: track.duration || 'Unknown', inline: true }
                );
            }

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to get player info: ${error.message}`)]
            });
        }
    }
};
