const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Seek to a position in the current track (in seconds)')
        .addIntegerOption(option =>
            option
                .setName('seconds')
                .setDescription('Position in seconds')
                .setRequired(true)
        ),
    cooldown: 5,
    aliases: [],
    prefix: true,
    async execute(interaction, args) {
        try {
            let seconds;
            if (interaction.options) {
                seconds = interaction.options?.getInteger('seconds');
            } else {
                seconds = parseInt(args[0]);
            }

            if (isNaN(seconds) || seconds < 0) {
                return interaction.reply({
                    embeds: [errorEmbed('Please provide a valid number of seconds.')]
                });
            }

            await musicManager.seek(interaction.guild.id, seconds * 1000);
            return interaction.reply({
                embeds: [successEmbed(`Seeked to **${seconds}** seconds.`)]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to seek: ${error.message}`)]
            });
        }
    }
};
