const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Manage your playlists')
        .addSubcommand(sub =>
            sub
                .setName('create')
                .setDescription('Create a new playlist')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Playlist name').setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('delete')
                .setDescription('Delete a playlist')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Playlist name').setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('info')
                .setDescription('Get playlist info')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Playlist name').setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('list').setDescription('List all your playlists')
        )
        .addSubcommand(sub =>
            sub
                .setName('load')
                .setDescription('Load a playlist into the queue')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Playlist name').setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('rename')
                .setDescription('Rename a playlist')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Current name').setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('newname').setDescription('New name').setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('addqueue')
                .setDescription('Add current queue to a playlist')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Playlist name').setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('removedupes')
                .setDescription('Remove duplicate tracks from a playlist')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Playlist name').setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('removetrack')
                .setDescription('Remove a track from a playlist by index')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Playlist name').setRequired(true)
                )
                .addIntegerOption(opt =>
                    opt.setName('index').setDescription('Track index to remove').setRequired(true)
                )
        ),
    cooldown: 5,
    aliases: ['pl'],
    prefix: true,
    async execute(interaction, args) {
        try {
            const subcommand = interaction.options?.getSubcommand() || args[0];
            const guildId = interaction.guild.id;
            const userId = interaction.user.id;

            if (!subcommand) {
                return interaction.reply({
                    embeds: [errorEmbed('Please specify a subcommand: create, delete, info, list, load, rename, addqueue, removedupes, removetrack.')]
                });
            }

            const knex = getDB();
            const ensureTable = async () => {
                const exists = await knex.schema.hasTable('playlists');
                if (!exists) {
                    await knex.schema.createTable('playlists', table => {
                        table.string('guild_id').notNullable();
                        table.string('user_id').notNullable();
                        table.string('name').notNullable();
                        table.json('tracks').notNullable();
                        table.timestamp('created_at').defaultTo(knex.fn.now());
                        table.primary(['guild_id', 'user_id', 'name']);
                    });
                }
            };

            await ensureTable();

            const getPlaylist = async (name) => {
                return knex('playlists')
                    .where({ guild_id: guildId, user_id: userId, name })
                    .first();
            };

            const parseArgs = (start) => args.slice(start).join(' ');

            switch (subcommand) {
                case 'create': {
                    const name = interaction.options?.getString('name') || args[1];
                    if (!name) {
                        return interaction.reply({ embeds: [errorEmbed('Please provide a playlist name.')] });
                    }

                    const existing = await getPlaylist(name);
                    if (existing) {
                        return interaction.reply({ embeds: [errorEmbed(`Playlist **${name}** already exists.`)] });
                    }

                    await knex('playlists').insert({
                        guild_id: guildId,
                        user_id: userId,
                        name,
                        tracks: JSON.stringify([]),
                        created_at: new Date()
                    });

                    return interaction.reply({ embeds: [successEmbed(`Playlist **${name}** created.`)] });
                }

                case 'delete': {
                    const name = interaction.options?.getString('name') || args[1];
                    if (!name) {
                        return interaction.reply({ embeds: [errorEmbed('Please provide a playlist name.')] });
                    }

                    const deleted = await knex('playlists')
                        .where({ guild_id: guildId, user_id: userId, name })
                        .del();

                    if (!deleted) {
                        return interaction.reply({ embeds: [errorEmbed(`Playlist **${name}** not found.`)] });
                    }

                    return interaction.reply({ embeds: [successEmbed(`Playlist **${name}** deleted.`)] });
                }

                case 'info': {
                    const name = interaction.options?.getString('name') || args[1];
                    if (!name) {
                        return interaction.reply({ embeds: [errorEmbed('Please provide a playlist name.')] });
                    }

                    const playlist = await getPlaylist(name);
                    if (!playlist) {
                        return interaction.reply({ embeds: [errorEmbed(`Playlist **${name}** not found.`)] });
                    }

                    const tracks = JSON.parse(playlist.tracks);
                    const embed = infoEmbed(`Playlist: ${name}`)
                        .addFields(
                            { name: 'Tracks', value: `${tracks.length}`, inline: true },
                            { name: 'Created', value: playlist.created_at?.toLocaleDateString() || 'Unknown', inline: true }
                        );

                    if (tracks.length > 0) {
                        const trackList = tracks.slice(0, 10).map((t, i) => `${i + 1}. ${t.title || 'Unknown'}`).join('\n');
                        embed.addFields({ name: 'Tracks (first 10)', value: trackList });
                    }

                    return interaction.reply({ embeds: [embed] });
                }

                case 'list': {
                    const playlists = await knex('playlists')
                        .where({ guild_id: guildId, user_id: userId });

                    if (!playlists.length) {
                        return interaction.reply({ embeds: [infoEmbed('You have no playlists.')] });
                    }

                    const list = playlists.map(p => {
                        const tracks = JSON.parse(p.tracks);
                        return `**${p.name}** - ${tracks.length} tracks`;
                    }).join('\n');

                    return interaction.reply({ embeds: [infoEmbed(list).setTitle('Your Playlists')] });
                }

                case 'load': {
                    const name = interaction.options?.getString('name') || args[1];
                    if (!name) {
                        return interaction.reply({ embeds: [errorEmbed('Please provide a playlist name.')] });
                    }

                    const playlist = await getPlaylist(name);
                    if (!playlist) {
                        return interaction.reply({ embeds: [errorEmbed(`Playlist **${name}** not found.`)] });
                    }

                    const tracks = JSON.parse(playlist.tracks);
                    if (!tracks.length) {
                        return interaction.reply({ embeds: [errorEmbed(`Playlist **${name}** is empty.`)] });
                    }

                    for (const track of tracks) {
                        musicManager.addToQueue(guildId, track);
                    }

                    return interaction.reply({ embeds: [successEmbed(`Loaded **${tracks.length}** tracks from **${name}**.`)] });
                }

                case 'rename': {
                    const name = interaction.options?.getString('name') || args[1];
                    const newName = interaction.options?.getString('newname') || args[2];
                    if (!name || !newName) {
                        return interaction.reply({ embeds: [errorEmbed('Please provide both current and new name.')] });
                    }

                    const existing = await getPlaylist(newName);
                    if (existing) {
                        return interaction.reply({ embeds: [errorEmbed(`Playlist **${newName}** already exists.`)] });
                    }

                    const updated = await knex('playlists')
                        .where({ guild_id: guildId, user_id: userId, name })
                        .update({ name: newName });

                    if (!updated) {
                        return interaction.reply({ embeds: [errorEmbed(`Playlist **${name}** not found.`)] });
                    }

                    return interaction.reply({ embeds: [successEmbed(`Playlist renamed to **${newName}**.`)] });
                }

                case 'addqueue': {
                    const name = interaction.options?.getString('name') || args[1];
                    if (!name) {
                        return interaction.reply({ embeds: [errorEmbed('Please provide a playlist name.')] });
                    }

                    const queue = musicManager.getQueue(guildId);
                    if (!queue.length && !queue.current) {
                        return interaction.reply({ embeds: [errorEmbed('The queue is empty.')] });
                    }

                    const playlist = await getPlaylist(name);
                    const existingTracks = playlist ? JSON.parse(playlist.tracks) : [];
                    const queueTracks = queue.current ? [queue.current, ...queue.tracks] : queue.tracks;
                    const newTracks = [...existingTracks, ...queueTracks.map(t => ({ title: t.info?.title || t.title, url: t.info?.uri || t.uri, author: t.info?.author || t.author, duration: t.info?.duration || t.duration }))];

                    if (playlist) {
                        await knex('playlists')
                            .where({ guild_id: guildId, user_id: userId, name })
                            .update({ tracks: JSON.stringify(newTracks) });
                    } else {
                        await knex('playlists').insert({
                            guild_id: guildId,
                            user_id: userId,
                            name,
                            tracks: JSON.stringify(newTracks),
                            created_at: new Date()
                        });
                    }

                    return interaction.reply({ embeds: [successEmbed(`Added **${queue.length}** tracks to **${name}**.`)] });
                }

                case 'removedupes': {
                    const name = interaction.options?.getString('name') || args[1];
                    if (!name) {
                        return interaction.reply({ embeds: [errorEmbed('Please provide a playlist name.')] });
                    }

                    const playlist = await getPlaylist(name);
                    if (!playlist) {
                        return interaction.reply({ embeds: [errorEmbed(`Playlist **${name}** not found.`)] });
                    }

                    const tracks = JSON.parse(playlist.tracks);
                    const seen = new Set();
                    const deduped = tracks.filter(t => {
                        const key = t.url || t.title;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });

                    await knex('playlists')
                        .where({ guild_id: guildId, user_id: userId, name })
                        .update({ tracks: JSON.stringify(deduped) });

                    return interaction.reply({ embeds: [successEmbed(`Removed **${tracks.length - deduped.length}** duplicates from **${name}**.`)] });
                }

                case 'removetrack': {
                    const name = interaction.options?.getString('name') || args[1];
                    const index = interaction.options?.getInteger('index') ?? parseInt(args[2]);
                    if (!name || index === undefined || isNaN(index)) {
                        return interaction.reply({ embeds: [errorEmbed('Please provide a playlist name and track index.')] });
                    }

                    const playlist = await getPlaylist(name);
                    if (!playlist) {
                        return interaction.reply({ embeds: [errorEmbed(`Playlist **${name}** not found.`)] });
                    }

                    const tracks = JSON.parse(playlist.tracks);
                    if (index < 0 || index >= tracks.length) {
                        return interaction.reply({ embeds: [errorEmbed(`Invalid index. Must be 0-${tracks.length - 1}.`)] });
                    }

                    const removed = tracks.splice(index, 1)[0];
                    await knex('playlists')
                        .where({ guild_id: guildId, user_id: userId, name })
                        .update({ tracks: JSON.stringify(tracks) });

                    return interaction.reply({ embeds: [successEmbed(`Removed **${removed.title || 'Unknown'}** from **${name}**.`)] });
                }

                default:
                    return interaction.reply({ embeds: [errorEmbed('Invalid subcommand.')] });
            }
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Playlist error: ${error.message}`)]
            });
        }
    }
};
