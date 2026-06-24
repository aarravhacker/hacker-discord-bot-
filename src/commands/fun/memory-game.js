const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'memory-game',
    description: 'Play a memory matching game',
    aliases: ['memory', 'match'],
    options: [],

    async execute(interaction) {
        const emojis = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🥝', '🍑'];
        const pairs = [...emojis, ...emojis];
        shuffle(pairs);

        const revealed = Array(16).fill(false);
        const matched = Array(16).fill(false);
        let firstPick = null;
        let moves = 0;
        let matches = 0;

        function buildBoard() {
            const embed = new EmbedBuilder()
                .setTitle('🧠 Memory Game')
                .setDescription(`Matches: **${matches}/8** | Moves: **${moves}**`)
                .setColor(0x9c27b0);

            const rows = [];
            for (let i = 0; i < 4; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < 4; j++) {
                    const idx = i * 4 + j;
                    if (matched[idx]) {
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`mem_${idx}`)
                                .setEmoji(pairs[idx])
                                .setStyle(ButtonStyle.Success)
                                .setDisabled(true)
                        );
                    } else if (revealed[idx]) {
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`mem_${idx}`)
                                .setEmoji(pairs[idx])
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true)
                        );
                    } else {
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`mem_${idx}`)
                                .setLabel('❓')
                                .setStyle(ButtonStyle.Secondary)
                        );
                    }
                }
                rows.push(row);
            }
            return rows;
        }

        const msg = await interaction.reply({ embeds: [new EmbedBuilder()
            .setTitle('🧠 Memory Game')
            .setDescription('Click buttons to reveal emojis. Match all pairs!')
            .setColor(0x9c27b0)
        ], components: buildBoard() });

        const collector = msg.createMessageComponentCollector({ time: 120000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'This is not your game!', ephemeral: true });
            }

            const idx = parseInt(i.customId.split('_')[1]);

            if (matched[idx] || revealed[idx]) {
                return i.reply({ content: 'Already revealed!', ephemeral: true });
            }

            revealed[idx] = true;
            moves++;

            if (firstPick === null) {
                firstPick = idx;
                const embed = new EmbedBuilder()
                    .setTitle('🧠 Memory Game')
                    .setDescription(`Matches: **${matches}/8** | Moves: **${moves}**\n\nPick another!`)
                    .setColor(0x9c27b0);
                i.update({ embeds: [embed], components: buildBoard() });
            } else {
                const secondPick = idx;

                if (pairs[firstPick] === pairs[secondPick]) {
                    matched[firstPick] = true;
                    matched[secondPick] = true;
                    matches++;
                    firstPick = null;

                    if (matches === 8) {
                        collector.stop();
                        const winEmbed = new EmbedBuilder()
                            .setTitle('🧠 Memory Game - You Win!')
                            .setDescription(`Completed in **${moves}** moves!`)
                            .setColor(0x4caf50);
                        return i.update({ embeds: [winEmbed], components: [] });
                    }

                    const embed = new EmbedBuilder()
                        .setTitle('🧠 Memory Game')
                        .setDescription(`Matches: **${matches}/8** | Moves: **${moves}**\n\n✅ Match found!`)
                        .setColor(0x4caf50);
                    i.update({ embeds: [embed], components: buildBoard() });
                } else {
                    const embed = new EmbedBuilder()
                        .setTitle('🧠 Memory Game')
                        .setDescription(`Matches: **${matches}/8** | Moves: **${moves}**\n\n❌ No match!`)
                        .setColor(0xff9800);
                    i.update({ embeds: [embed], components: buildBoard() });

                    setTimeout(() => {
                        revealed[firstPick] = false;
                        revealed[secondPick] = false;
                        firstPick = null;
                        const resetEmbed = new EmbedBuilder()
                            .setTitle('🧠 Memory Game')
                            .setDescription(`Matches: **${matches}/8** | Moves: **${moves}**`)
                            .setColor(0x9c27b0);
                        i.editReply({ embeds: [resetEmbed], components: buildBoard() });
                    }, 1000);
                }
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}
