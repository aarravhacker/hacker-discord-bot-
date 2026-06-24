const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggle')
        .setDescription('Toggle various music settings')
        .addSubcommand(sub =>
            sub
                .setName('preset')
                .setDescription('Toggle an audio preset')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Preset name').setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('source')
                .setDescription('Toggle an audio source')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Source name').setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('volume')
                .setDescription('Set the volume')
                .addIntegerOption(opt =>
                    opt.setName('level').setDescription('Volume level (0-100)').setRequired(true)
                )
        ),
    cooldown: 5,
    aliases: ['tg'],
    prefix: true,
    async execute(interaction, args) {
        try {
            const subcommand = interaction.options?.getSubcommand() || args[0];

            switch (subcommand) {
                case 'preset': {
                    let name;
                    if (interaction.options) {
                        name = interaction.options.getString('name');
                    } else {
                        name = args[1];
                    }

                    if (!name) {
                        return interaction.reply({ embeds: [errorEmbed('Please provide a preset name.')] });
                    }

                    await musicManager.togglePreset(interaction.guild.id, name);
                    return interaction.reply({
                        embeds: [successEmbed(`Preset **${name}** toggled.`)]
                    });
                }

                case 'source': {
                    let name;
                    if (interaction.options) {
                        name = interaction.options.getString('name');
                    } else {
                        name = args[1];
                    }

                    if (!name) {
                        return interaction.reply({ embeds: [errorEmbed('Please provide a source name.')] });
                    }

                    await musicManager.toggleSource(interaction.guild.id, name);
                    return interaction.reply({
                        embeds: [successEmbed(`Source **${name}** toggled.`)]
                    });
                }

                case 'volume': {
                    let level;
                    if (interaction.options) {
                        level = interaction.options.getInteger('level');
                    } else {
                        level = parseInt(args[1]);
                    }

                    if (isNaN(level) || level < 0 || level > 100) {
                        return interaction.reply({ embeds: [errorEmbed('Volume must be between 0 and 100.')] });
                    }

                    await musicManager.setVolume(interaction.guild.id, level);
                    return interaction.reply({
                        embeds: [successEmbed(`Volume set to **${level}%**.`)]
                    });
                }

                default:
                    return interaction.reply({ embeds: [errorEmbed('Invalid subcommand. Use: preset, source, volume.')] });
            }
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Toggle error: ${error.message}`)]
            });
        }
    }
};
