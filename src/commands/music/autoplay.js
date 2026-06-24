const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Toggle autoplay mode'),
    cooldown: 5,
    aliases: ['ap'],
    prefix: true,
    async execute(interaction, args) {
        try {
            const enabled = await musicManager.toggleAutoplay(interaction.guild.id);
            return interaction.reply({
                embeds: [successEmbed(`Autoplay is now **${enabled ? 'enabled' : 'disabled'}**.`)]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to toggle autoplay: ${error.message}`)]
            });
        }
    }
};
