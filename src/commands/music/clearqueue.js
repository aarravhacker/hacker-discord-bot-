const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearqueue')
        .setDescription('Clear the music queue'),
    cooldown: 5,
    aliases: ['cq', 'flush'],
    prefix: true,
    async execute(interaction, args) {
        try {
            await musicManager.clearQueue(interaction.guild.id);
            return interaction.reply({
                embeds: [successEmbed('The music queue has been cleared.')]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to clear queue: ${error.message}`)]
            });
        }
    }
};
