const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('damon')
        .setDescription('Apply Damon voice filter'),
    cooldown: 5,
    aliases: [],
    prefix: true,
    async execute(interaction, args) {
        try {
            await musicManager.addFilter(interaction.guild.id, 'damon');
            return interaction.reply({
                embeds: [successEmbed('Damon filter applied.')]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to apply Damon filter: ${error.message}`)]
            });
        }
    }
};
