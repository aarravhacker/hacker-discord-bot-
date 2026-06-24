const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slomo')
        .setDescription('Apply slow motion filter'),
    cooldown: 5,
    aliases: ['slow'],
    prefix: true,
    async execute(interaction, args) {
        try {
            await musicManager.addFilter(interaction.guild.id, 'slomo');
            return interaction.reply({
                embeds: [successEmbed('Slow motion filter applied.')]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to apply slow motion filter: ${error.message}`)]
            });
        }
    }
};
