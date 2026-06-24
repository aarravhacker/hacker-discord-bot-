const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'battleship',
    description: 'Play battleship against another user',
    aliases: [],
    options: [
        {
            name: 'opponent',
            type: 6,
            description: 'The user to play against',
            required: true
        }
    ],

    async execute(interaction) {
        const opponent = interaction.options.getUser('opponent');
        if (opponent.id === interaction.user.id) {
            return interaction.reply({ content: 'You can\'t play against yourself!', ephemeral: true });
        }

        const SIZE = 5;
        const SHIPS = [2, 2, 3, 3, 4];

        const boards = {
            [interaction.user.id]: createBoard(SIZE),
            [opponent.id]: createBoard(SIZE)
        };

        const ships = {
            [interaction.user.id]: placeShips(SIZE, SHIPS),
            [opponent.id]: placeShips(SIZE, SHIPS)
        };

        const hits = {
            [interaction.user.id]: new Set(),
            [opponent.id]: new Set()
        };

        let turn = interaction.user.id;
        const embed = new EmbedBuilder()
            .setTitle('🚢 Battleship')
            .setDescription(`${turn === interaction.user.id ? interaction.user.username : opponent.username}'s turn`)
            .setColor(0x0288d1);

        const row = getGridRow(0);

        const msg = await interaction.reply({ embeds: [embed], components: [row] });
        const collector = msg.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== turn) {
                return i.reply({ content: 'It\'s not your turn!', ephemeral: true });
            }

            if (i.customId === 'bs_cancel') {
                collector.stop();
                const cancelEmbed = new EmbedBuilder()
                    .setTitle('🚢 Battleship - Cancelled')
                    .setDescription('Game cancelled.')
                    .setColor(0xff0000);
                return i.update({ embeds: [cancelEmbed], components: [] });
            }

            if (i.customId.startsWith('bs_')) {
                const [, row, col] = i.customId.split('_').slice(1).map(Number);
                const opponentId = turn === interaction.user.id ? opponent.id : interaction.user.id;

                const hitKey = `${opponentId}-${row}-${col}`;
                if (hits[turn].has(hitKey)) {
                    return i.reply({ content: 'Already shot there!', ephemeral: true });
                }

                hits[turn].add(hitKey);

                const isHit = boards[opponentId].ships.some(s =>
                    s.some(([sr, sc]) => sr === row && sc === col)
                );

                let resultText;
                if (isHit) {
                    resultText = 'HIT!';
                    const allSunk = checkAllSunk(boards[opponentId].ships, hits[turn]);
                    if (allSunk) {
                        const winEmbed = new EmbedBuilder()
                            .setTitle('🚢 Battleship - Game Over!')
                            .setDescription(`${turn === interaction.user.id ? interaction.user.username : opponent.username} wins!`)
                            .setColor(0x4caf50);
                        collector.stop();
                        return i.update({ embeds: [winEmbed], components: [] });
                    }
                } else {
                    resultText = 'Miss!';
                }

                turn = turn === interaction.user.id ? opponent.id : interaction.user.id;
                const nextTurnUser = turn === interaction.user.id ? interaction.user : opponent;

                const newEmbed = new EmbedBuilder()
                    .setTitle('🚢 Battleship')
                    .setDescription(`**${resultText}**\n\n${nextTurnUser.username}'s turn`)
                    .setColor(0x0288d1);

                i.update({ embeds: [newEmbed], components: [getGridRow(0)] });
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};

function createBoard(size) {
    return {
        grid: Array(size).fill(null).map(() => Array(size).fill(null)),
        ships: []
    };
}

function placeShips(size, shipSizes) {
    const grid = Array(size).fill(null).map(() => Array(size).fill(false));
    const ships = [];

    for (const size of shipSizes) {
        let placed = false;
        while (!placed) {
            const horizontal = Math.random() < 0.5;
            const r = Math.floor(Math.random() * size);
            const c = Math.floor(Math.random() * size);

            const positions = [];
            for (let i = 0; i < size; i++) {
                if (horizontal) {
                    if (c + i >= size) break;
                    positions.push([r, c + i]);
                } else {
                    if (r + i >= size) break;
                    positions.push([r + i, c]);
                }
            }

            if (positions.length === size && positions.every(([pr, pc]) => !grid[pr][pc])) {
                positions.forEach(([pr, pc]) => grid[pr][pc] = true);
                ships.push(positions);
                placed = true;
            }
        }
    }

    return ships;
}

function checkAllSunk(ships, hits) {
    return ships.every(ship =>
        ship.every(([r, c]) => hits.has(`-${r}-${c}`))
    );
}

function getGridRow(page) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('bs_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );
}
