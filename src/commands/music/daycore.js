const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daycore')
        .setDescription('Apply daycore filter (slower + lower pitch)'),
    cooldown: 5,
    aliases: ['dc'],
    prefix: true,
    async execute(interaction, args) {
        try {
            await musicManager.addFilter(interaction.guild.id, 'daycore');
            return interaction.reply({
                embeds: [successEmbed('Daycore filter applied.')]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to apply daycore filter: ${error.message}`)]
            });
        }
    }
};
