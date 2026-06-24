const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('grab')
        .setDescription('Grab the current song info and send it to your DMs'),
    cooldown: 5,
    aliases: ['save', 'dm'],
    prefix: true,
    async execute(interaction, args) {
        try {
            const track = musicManager.getCurrentTrack(interaction.guild.id);
            if (!track) {
                return interaction.reply({
                    embeds: [errorEmbed('Nothing is currently playing.')],
                    ephemeral: true
                });
            }

            const embed = infoEmbed(`**${track.title}**`)
                .addFields(
                    { name: 'Artist', value: track.author || 'Unknown', inline: true },
                    { name: 'Duration', value: track.duration || 'Unknown', inline: true },
                    { name: 'URL', value: track.url || 'N/A', inline: false },
                    { name: 'Requested By', value: track.requestedBy?.tag || 'Unknown', inline: true }
                );

            await interaction.user.send({ embeds: [embed] });
            return interaction.reply({
                embeds: [successEmbed('Song info sent to your DMs.')],
                ephemeral: true
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to grab song info: ${error.message}`)]
            });
        }
    }
};
