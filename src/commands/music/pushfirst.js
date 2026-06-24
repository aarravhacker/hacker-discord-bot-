const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pushfirst')
        .setDescription('Add a song to the front of the queue')
        .addStringOption(option =>
            option
                .setName('query')
                .setDescription('Song to search for')
                .setRequired(true)
        ),
    cooldown: 5,
    aliases: ['pf', 'front'],
    prefix: true,
    async execute(interaction, args) {
        try {
            let query;
            if (interaction.options) {
                query = interaction.options?.getString('query');
            } else {
                query = args.join(' ');
            }

            if (!query) {
                return interaction.reply({
                    embeds: [errorEmbed('Please provide a song query.')]
                });
            }

            const tracks = await musicManager.searchTrack(query);
            if (!tracks || tracks.length === 0) {
                return interaction.reply({
                    embeds: [errorEmbed('No results found.')]
                });
            }
            const track = tracks[0];

            await musicManager.pushToFront(interaction.guild.id, track);
            return interaction.reply({
                embeds: [successEmbed(`Added **${track.title}** to the front of the queue.`)]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to add song: ${error.message}`)]
            });
        }
    }
};
