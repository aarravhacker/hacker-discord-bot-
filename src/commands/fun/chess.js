const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'chess',
    description: 'Play chess against another user',
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

        const initialBoard = [
            ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
            ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
            ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
        ];

        let board = initialBoard;
        let currentTurn = interaction.user.id;
        let selectedPiece = null;

        const embed = buildBoardEmbed(board, currentTurn, interaction.user, opponent);
        const row = getControlRow();

        const msg = await interaction.reply({ embeds: [embed], components: [row] });
        const collector = msg.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== currentTurn) {
                return i.reply({ content: 'It\'s not your turn!', ephemeral: true });
            }

            if (i.customId === 'chess_cancel') {
                collector.stop();
                const cancelEmbed = new EmbedBuilder()
                    .setTitle('♟ Chess - Cancelled')
                    .setDescription('Game cancelled.')
                    .setColor(0xff0000);
                return i.update({ embeds: [cancelEmbed], components: [] });
            }

            if (i.customId === 'chess_move') {
                const fromRow = Math.floor(Math.random() * 8);
                const fromCol = Math.floor(Math.random() * 8);
                const toRow = Math.floor(Math.random() * 8);
                const toCol = Math.floor(Math.random() * 8);

                if (board[fromRow][fromCol]) {
                    board[toRow][toCol] = board[fromRow][fromCol];
                    board[fromRow][fromCol] = '';
                }

                currentTurn = currentTurn === interaction.user.id ? opponent.id : interaction.user.id;

                const newEmbed = buildBoardEmbed(board, currentTurn, interaction.user, opponent);
                i.update({ embeds: [newEmbed], components: [getControlRow()] });
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};

function buildBoardEmbed(board, currentTurn, white, black) {
    const turnUser = currentTurn === white.id ? white : black;
    const whitePieces = board.flat().filter(p => p && p.charCodeAt(0) >= 0x2654 && p.charCodeAt(0) <= 0x265f).length;
    const blackPieces = board.flat().filter(p => p && p.charCodeAt(0) >= 0x265f && p.charCodeAt(0) <= 0x266f).length;

    const display = board.map((row, i) => {
        const rank = 8 - i;
        const pieces = row.map(p => p || '·').join('  ');
        return `${rank} ${pieces}`;
    }).join('\n');

    return new EmbedBuilder()
        .setTitle('♟ Chess')
        .setDescription(`${display}\n\n  a  b  c  d  e  f  g  h\n\n**${turnUser.username}'s turn (${currentTurn === white.id ? 'White' : 'Black'})**`)
        .setColor(currentTurn === white.id ? 0xffffff : 0x000000)
        .setFooter({ text: 'Use buttons to play' });
}

function getControlRow() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('chess_move').setLabel('Move').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('chess_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );
}
