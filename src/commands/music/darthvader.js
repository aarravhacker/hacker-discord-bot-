const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('darthvader')
        .setDescription('Apply Darth Vader voice filter (deep voice)'),
    cooldown: 5,
    aliases: ['vader', 'deep'],
    prefix: true,
    async execute(interaction, args) {
        try {
            await musicManager.addFilter(interaction.guild.id, 'darthvader');
            return interaction.reply({
                embeds: [successEmbed('Darth Vader filter applied.')]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to apply Darth Vader filter: ${error.message}`)]
            });
        }
    }
};
