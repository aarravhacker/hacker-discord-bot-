const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lofi')
        .setDescription('Apply lo-fi filter'),
    cooldown: 5,
    aliases: ['lo-fi'],
    prefix: true,
    async execute(interaction, args) {
        try {
            await musicManager.addFilter(interaction.guild.id, 'lofi');
            return interaction.reply({
                embeds: [successEmbed('Lo-fi filter applied.')]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to apply lo-fi filter: ${error.message}`)]
            });
        }
    }
};
