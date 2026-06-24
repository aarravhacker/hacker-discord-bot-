const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vibrate')
        .setDescription('Apply vibration filter'),
    cooldown: 5,
    aliases: ['vib', 'shake'],
    prefix: true,
    async execute(interaction, args) {
        try {
            await musicManager.addFilter(interaction.guild.id, 'vibrate');
            return interaction.reply({
                embeds: [successEmbed('Vibration filter applied.')]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to apply vibration filter: ${error.message}`)]
            });
        }
    }
};
