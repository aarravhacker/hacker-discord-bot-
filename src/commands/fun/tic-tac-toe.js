const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'tic-tac-toe',
    description: 'Play Tic Tac Toe against another user',
    aliases: ['ttt'],
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

        const board = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
        const players = { [interaction.user.id]: '❌', [opponent.id]: '⭕' };
        let current = interaction.user.id;

        function buildBoard() {
            const rows = [];
            for (let i = 0; i < 3; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < 3; j++) {
                    const idx = i * 3 + j;
                    const isTaken = board[idx] === '❌' || board[idx] === '⭕';
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ttt_${idx}`)
                            .setLabel(board[idx])
                            .setStyle(isTaken ? ButtonStyle.Secondary : ButtonStyle.Primary)
                            .setDisabled(isTaken)
                    );
                }
                rows.push(row);
            }
            return rows;
        }

        function checkWin() {
            const wins = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8],
                [0, 3, 6], [1, 4, 7], [2, 5, 8],
                [0, 4, 8], [2, 4, 6]
            ];
            for (const [a, b, c] of wins) {
                if (board[a] === board[b] && board[b] === board[c]) {
                    return board[a];
                }
            }
            return null;
        }

        function isDraw() {
            return board.every(cell => cell === '❌' || cell === '⭕');
        }

        const embed = new EmbedBuilder()
            .setTitle('❌⭕ Tic Tac Toe')
            .setDescription(`${current === interaction.user.id ? interaction.user.username : opponent.username}'s turn (${players[current]})`)
            .setColor(0x2196f3);

        const msg = await interaction.reply({ embeds: [embed], components: buildBoard() });
        const collector = msg.createMessageComponentCollector({ time: 120000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== current) {
                return i.reply({ content: 'It\'s not your turn!', ephemeral: true });
            }

            const idx = parseInt(i.customId.split('_')[1]);

            if (board[idx] === '❌' || board[idx] === '⭕') {
                return i.reply({ content: 'Already taken!', ephemeral: true });
            }

            board[idx] = players[current];

            const win = checkWin();
            if (win) {
                const winner = current === interaction.user.id ? interaction.user : opponent;
                const winEmbed = new EmbedBuilder()
                    .setTitle('❌⭕ Tic Tac Toe')
                    .setDescription(`**${winner.username}** (${win}) wins! 🎉`)
                    .setColor(0x4caf50);
                collector.stop();
                return i.update({ embeds: [winEmbed], components: buildBoard() });
            }

            if (isDraw()) {
                const drawEmbed = new EmbedBuilder()
                    .setTitle('❌⭕ Tic Tac Toe')
                    .setDescription('It\'s a **draw**!')
                    .setColor(0xffeb3b);
                collector.stop();
                return i.update({ embeds: [drawEmbed], components: buildBoard() });
            }

            current = current === interaction.user.id ? opponent.id : interaction.user.id;
            const nextUser = current === interaction.user.id ? interaction.user : opponent;

            const newEmbed = new EmbedBuilder()
                .setTitle('❌⭕ Tic Tac Toe')
                .setDescription(`${nextUser.username}'s turn (${players[current]})`)
                .setColor(0x2196f3);

            i.update({ embeds: [newEmbed], components: buildBoard() });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};
