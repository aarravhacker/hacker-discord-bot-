const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chipmunk')
        .setDescription('Apply chipmunk voice filter (high pitch)'),
    cooldown: 5,
    aliases: ['chip'],
    prefix: true,
    async execute(interaction, args) {
        try {
            await musicManager.addFilter(interaction.guild.id, 'chipmunk');
            return interaction.reply({
                embeds: [successEmbed('Chipmunk filter applied.')]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to apply chipmunk filter: ${error.message}`)]
            });
        }
    }
};
