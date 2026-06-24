const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forcefix')
        .setDescription('Force fix playback issues by restarting the current track'),
    cooldown: 10,
    aliases: ['ff', 'restart'],
    prefix: true,
    async execute(interaction, args) {
        try {
            await musicManager.forceFix(interaction.guild.id);
            return interaction.reply({
                embeds: [successEmbed('Playback has been restarted.')]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to fix playback: ${error.message}`)]
            });
        }
    }
};
