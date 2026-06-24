const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('spotify')
        .setDescription('Spotify integration commands')
        .addSubcommand(sub =>
            sub.setName('login').setDescription('Login to Spotify')
        )
        .addSubcommand(sub =>
            sub
                .setName('playlist')
                .setDescription('Load a Spotify playlist')
                .addStringOption(opt =>
                    opt.setName('query').setDescription('Spotify playlist URL or name').setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('profile')
                .setDescription('View a Spotify profile')
                .addUserOption(opt =>
                    opt.setName('user').setDescription('User to check (defaults to you)')
                )
        ),
    cooldown: 10,
    aliases: ['sp'],
    prefix: true,
    async execute(interaction, args) {
        try {
            const subcommand = interaction.options?.getSubcommand() || args[0];

            switch (subcommand) {
                case 'login': {
                    const url = await musicManager.getSpotifyAuthUrl(interaction.user.id);
                    return interaction.reply({
                        embeds: [infoEmbed(`[Click here to login to Spotify](${url})`)],
                        ephemeral: true
                    });
                }

                case 'playlist': {
                    let query;
                    if (interaction.options) {
                        query = interaction.options.getString('query');
                    } else {
                        query = args.slice(1).join(' ');
                    }

                    if (!query) {
                        return interaction.reply({ embeds: [errorEmbed('Please provide a Spotify playlist URL or name.')] });
                    }

                    const result = await musicManager.loadSpotifyPlaylist(interaction.guild.id, interaction.user.id, query);
                    return interaction.reply({
                        embeds: [successEmbed(`Loaded **${result.trackCount}** tracks from Spotify playlist **${result.name}**.`)]
                    });
                }

                case 'profile': {
                    const targetUser = interaction.options?.getUser('user') || interaction.user;
                    const profile = await musicManager.getSpotifyProfile(targetUser.id);

                    if (!profile) {
                        return interaction.reply({ embeds: [errorEmbed(`${targetUser.tag} has not linked their Spotify account.`)] });
                    }

                    const embed = infoEmbed(`${profile.display_name}'s Spotify Profile`)
                        .addFields(
                            { name: 'Followers', value: `${profile.followers}`, inline: true },
                            { name: 'Profile', value: `[Open](${profile.external_urls?.spotify || '#'})`, inline: true }
                        );

                    if (profile.now_playing) {
                        embed.addFields({ name: 'Now Playing', value: `${profile.now_playing.name} - ${profile.now_playing.artists}`, inline: false });
                    }

                    return interaction.reply({ embeds: [embed] });
                }

                default:
                    return interaction.reply({ embeds: [errorEmbed('Invalid subcommand. Use: login, playlist, profile.')] });
            }
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Spotify error: ${error.message}`)]
            });
        }
    }
};
