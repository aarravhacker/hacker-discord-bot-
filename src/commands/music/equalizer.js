const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('equalizer')
        .setDescription('Apply an equalizer preset')
        .addStringOption(option =>
            option
                .setName('preset')
                .setDescription('The EQ preset to apply')
                .setRequired(true)
                .addChoices(
                    { name: 'Bass', value: 'bass' },
                    { name: 'Flat', value: 'flat' },
                    { name: 'Vocal', value: 'vocal' },
                    { name: 'Treble', value: 'treble' }
                )
        ),
    cooldown: 5,
    aliases: ['eq'],
    prefix: true,
    async execute(interaction, args) {
        try {
            let preset;
            if (interaction.options) {
                preset = interaction.options?.getString('preset');
            } else {
                preset = args[0];
            }

            if (!preset || !['bass', 'flat', 'vocal', 'treble'].includes(preset)) {
                return interaction.reply({
                    embeds: [errorEmbed('Please provide a valid preset: bass, flat, vocal, or treble.')]
                });
            }

            await musicManager.setEqualizer(interaction.guild.id, preset);
            return interaction.reply({
                embeds: [successEmbed(`Equalizer set to **${preset}** preset.`)]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to set equalizer: ${error.message}`)]
            });
        }
    }
};
