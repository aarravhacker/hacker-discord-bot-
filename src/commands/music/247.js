const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('247')
        .setDescription('Toggle 24/7 mode (stay in voice channel)'),
    cooldown: 5,
    aliases: ['24/7', 'stay'],
    prefix: true,
    async execute(interaction, args) {
        try {
            const enabled = await musicManager.toggle247(interaction.guild.id);
            return interaction.reply({
                embeds: [successEmbed(`24/7 mode is now **${enabled ? 'enabled' : 'disabled'}**.`)]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to toggle 24/7 mode: ${error.message}`)]
            });
        }
    }
};
