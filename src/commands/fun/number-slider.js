const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'number-slider',
    description: 'Play the 15-puzzle slider game',
    aliases: ['slider', '15puzzle'],
    options: [],

    async execute(interaction) {
        let tiles = [...Array(15).keys()].map(i => i + 1).concat([0]);
        shuffle(tiles);

        let moves = 0;

        function getEmptyIndex() {
            return tiles.indexOf(0);
        }

        function canMove(idx) {
            const empty = getEmptyIndex();
            const row = Math.floor(idx / 4);
            const col = idx % 4;
            const emptyRow = Math.floor(empty / 4);
            const emptyCol = empty % 4;
            return (row === emptyRow && Math.abs(col - emptyCol) === 1) ||
                   (col === emptyCol && Math.abs(row - emptyRow) === 1);
        }

        function buildBoard() {
            const rows = [];
            for (let i = 0; i < 4; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < 4; j++) {
                    const idx = i * 4 + j;
                    const val = tiles[idx];
                    if (val === 0) {
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`slider_${idx}`)
                                .setLabel(' ')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true)
                        );
                    } else {
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`slider_${idx}`)
                                .setLabel(val.toString())
                                .setStyle(ButtonStyle.Primary)
                        );
                    }
                }
                rows.push(row);
            }
            return rows;
        }

        function isSolved() {
            for (let i = 0; i < 15; i++) {
                if (tiles[i] !== i + 1) return false;
            }
            return tiles[15] === 0;
        }

        const embed = new EmbedBuilder()
            .setTitle('🔢 Number Slider')
            .setDescription(`Arrange numbers 1-15 in order.\n\nMoves: **${moves}**`)
            .setColor(0xff5722);

        const msg = await interaction.reply({ embeds: [embed], components: buildBoard() });
        const collector = msg.createMessageComponentCollector({ time: 120000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'This is not your game!', ephemeral: true });
            }

            const idx = parseInt(i.customId.split('_')[1]);

            if (!canMove(idx)) {
                return i.reply({ content: 'Can\'t move that tile!', ephemeral: true });
            }

            const empty = getEmptyIndex();
            [tiles[empty], tiles[idx]] = [tiles[idx], tiles[empty]];
            moves++;

            if (isSolved()) {
                collector.stop();
                const winEmbed = new EmbedBuilder()
                    .setTitle('🔢 Number Slider - You Win!')
                    .setDescription(`Solved in **${moves}** moves!`)
                    .setColor(0x4caf50);
                return i.update({ embeds: [winEmbed], components: [] });
            }

            const newEmbed = new EmbedBuilder()
                .setTitle('🔢 Number Slider')
                .setDescription(`Arrange numbers 1-15 in order.\n\nMoves: **${moves}**`)
                .setColor(0xff5722);

            i.update({ embeds: [newEmbed], components: buildBoard() });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};

function shuffle(arr) {
    let inversions;
    do {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        inversions = 0;
        for (let i = 0; i < arr.length; i++) {
            for (let j = i + 1; j < arr.length; j++) {
                if (arr[i] && arr[j] && arr[i] > arr[j]) inversions++;
            }
        }
    } while (inversions % 2 !== 0);
}
