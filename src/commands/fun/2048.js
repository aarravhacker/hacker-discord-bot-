const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: '2048',
    description: 'Play the 2048 puzzle game',
    aliases: [],
    options: [],

    async execute(interaction, args) {
        const board = createBoard();
        const embed = buildEmbed(board, 0);

        const row = getButtonRow();

        const msg = await interaction.reply({ embeds: [embed], components: [row] });

        const collector = msg.createMessageComponentCollector({ time: 120000 });

        let score = 0;
        let currentBoard = board;

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'This is not your game!', ephemeral: true });
            }

            if (i.customId === '2048_restart') {
                currentBoard = createBoard();
                score = 0;
                const newEmbed = buildEmbed(currentBoard, score);
                return i.update({ embeds: [newEmbed], components: [getButtonRow()] });
            }

            const dir = i.customId.replace('2048_', '');
            const result = move(currentBoard, dir);

            if (!result.moved) {
                return i.reply({ content: 'Invalid move!', ephemeral: true });
            }

            currentBoard = result.board;
            score += result.points;
            addRandomTile(currentBoard);

            if (isGameOver(currentBoard)) {
                const gameOverEmbed = new EmbedBuilder()
                    .setTitle('2048 - Game Over!')
                    .setDescription(`Final Score: **${score}**`)
                    .setColor(0xff0000);
                return i.update({ embeds: [gameOverEmbed], components: [] });
            }

            if (hasWon(currentBoard)) {
                const winEmbed = new EmbedBuilder()
                    .setTitle('2048 - You Win!')
                    .setDescription(`Score: **${score}**`)
                    .setColor(0x00ff00);
                return i.update({ embeds: [winEmbed], components: [] });
            }

            const newEmbed = buildEmbed(currentBoard, score);
            i.update({ embeds: [newEmbed], components: [getButtonRow()] });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};

function createBoard() {
    const board = Array(4).fill(null).map(() => Array(4).fill(0));
    addRandomTile(board);
    addRandomTile(board);
    return board;
}

function addRandomTile(board) {
    const empty = [];
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (board[r][c] === 0) empty.push([r, c]);
        }
    }
    if (empty.length === 0) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    board[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function buildEmbed(board, score) {
    const display = board.map(row =>
        row.map(v => v === 0 ? '⬜' : `**${v}**`).join(' ')
    ).join('\n');

    return new EmbedBuilder()
        .setTitle('2048 Puzzle')
        .setDescription(display)
        .setColor(0xf9a825)
        .setFooter({ text: `Score: ${score}` });
}

function getButtonRow() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('2048_up').setLabel('⬆').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('2048_down').setLabel('⬇').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('2048_left').setLabel('⬅').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('2048_right').setLabel('➡').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('2048_restart').setLabel('🔄').setStyle(ButtonStyle.Secondary)
        );
}

function move(board, dir) {
    let moved = false;
    let points = 0;
    const b = board.map(r => [...r]);

    const rotate = (b) => {
        const n = b.length;
        const res = Array(n).fill(null).map(() => Array(n).fill(0));
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) res[c][n - 1 - r] = b[r][c];
        return res;
    };

    let rotations = 0;
    if (dir === 'up') rotations = 1;
    else if (dir === 'right') rotations = 2;
    else if (dir === 'down') rotations = 3;

    let current = b;
    for (let i = 0; i < rotations; i++) current = rotate(current);

    for (let r = 0; r < 4; r++) {
        const row = current[r].filter(v => v !== 0);
        for (let i = 0; i < row.length - 1; i++) {
            if (row[i] === row[i + 1]) {
                row[i] *= 2;
                points += row[i];
                row.splice(i + 1, 1);
            }
        }
        while (row.length < 4) row.push(0);
        for (let c = 0; c < 4; c++) {
            if (current[r][c] !== row[c]) moved = true;
            current[r][c] = row[c];
        }
    }

    for (let i = 0; i < (4 - rotations) % 4; i++) current = rotate(current);

    return { board: current, moved, points };
}

function isGameOver(board) {
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (board[r][c] === 0) return false;
            if (c < 3 && board[r][c] === board[r][c + 1]) return false;
            if (r < 3 && board[r][c] === board[r + 1][c]) return false;
        }
    }
    return true;
}

function hasWon(board) {
    return board.some(row => row.some(v => v === 2048));
}
