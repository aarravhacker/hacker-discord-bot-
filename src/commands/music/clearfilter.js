const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearfilter')
        .setDescription('Clear all audio filters'),
    cooldown: 5,
    aliases: ['cf', 'nofilter'],
    prefix: true,
    async execute(interaction, args) {
        try {
            await musicManager.clearFilters(interaction.guild.id);
            return interaction.reply({
                embeds: [successEmbed('All audio filters have been cleared.')]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to clear filters: ${error.message}`)]
            });
        }
    }
};
