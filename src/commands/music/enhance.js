const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enhance')
        .setDescription('Enhance audio quality'),
    cooldown: 5,
    aliases: ['boost', 'audio'],
    prefix: true,
    async execute(interaction, args) {
        try {
            await musicManager.addFilter(interaction.guild.id, 'enhance');
            return interaction.reply({
                embeds: [successEmbed('Audio enhancement applied.')]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to apply enhancement: ${error.message}`)]
            });
        }
    }
};
