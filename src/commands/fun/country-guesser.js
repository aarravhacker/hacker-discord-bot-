const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'country-guesser',
    description: 'Guess the country from the flag',
    aliases: ['country'],
    options: [],

    async execute(interaction) {
        const countries = [
            { name: 'Japan', flag: '🇯🇵' },
            { name: 'Brazil', flag: '🇧🇷' },
            { name: 'France', flag: '🇫🇷' },
            { name: 'Germany', flag: '🇩🇪' },
            { name: 'Italy', flag: '🇮🇹' },
            { name: 'Canada', flag: '🇨🇦' },
            { name: 'Australia', flag: '🇦🇺' },
            { name: 'Mexico', flag: '🇲🇽' },
            { name: 'South Korea', flag: '🇰🇷' },
            { name: 'India', flag: '🇮🇳' },
            { name: 'China', flag: '🇨🇳' },
            { name: 'Russia', flag: '🇷🇺' },
            { name: 'Spain', flag: '🇪🇸' },
            { name: 'United Kingdom', flag: '🇬🇧' },
            { name: 'United States', flag: '🇺🇸' },
            { name: 'Turkey', flag: '🇹🇷' },
            { name: 'Egypt', flag: '🇪🇬' },
            { name: 'Nigeria', flag: '🇳🇬' },
            { name: 'Argentina', flag: '🇦🇷' },
            { name: 'Sweden', flag: '🇸🇪' },
            { name: 'Norway', flag: '🇳🇴' },
            { name: 'Poland', flag: '🇵🇱' },
            { name: 'Thailand', flag: '🇹🇭' },
            { name: 'Vietnam', flag: '🇻🇳' },
            { name: 'Indonesia', flag: '🇮🇩' }
        ];

        let score = 0;
        let round = 0;
        const maxRounds = 5;

        function getRound() {
            const shuffled = [...countries].sort(() => Math.random() - 0.5);
            const correct = shuffled[0];
            const options = shuffled.slice(0, 4).sort(() => Math.random() - 0.5);
            return { correct, options };
        }

        let current = getRound();
        round++;

        const embed = new EmbedBuilder()
            .setTitle('🌍 Country Guesser')
            .setDescription(`Round **${round}/${maxRounds}**\n\n${current.correct.flag}\n\n**Which country is this?**`)
            .setColor(0x2196f3)
            .setFooter({ text: `Score: ${score}` });

        const row = new ActionRowBuilder();
        current.options.forEach(opt => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`country_${opt.name}`)
                    .setLabel(opt.name)
                    .setStyle(ButtonStyle.Secondary)
            );
        });

        const msg = await interaction.reply({ embeds: [embed], components: [row] });
        const collector = msg.createMessageComponentCollector({ time: 30000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'This is not your game!', ephemeral: true });
            }

            const guess = i.customId.replace('country_', '');

            if (guess === current.correct.name) {
                score++;
                const correctEmbed = new EmbedBuilder()
                    .setTitle('🌍 Country Guesser')
                    .setDescription(`✅ Correct! **${current.correct.name}**\n\nScore: **${score}**`)
                    .setColor(0x4caf50);
                await i.update({ embeds: [correctEmbed], components: [] });
            } else {
                const wrongEmbed = new EmbedBuilder()
                    .setTitle('🌍 Country Guesser')
                    .setDescription(`❌ Wrong! The answer was **${current.correct.name}**`)
                    .setColor(0xff0000);
                await i.update({ embeds: [wrongEmbed], components: [] });
            }

            if (round >= maxRounds) {
                collector.stop();
                const finalEmbed = new EmbedBuilder()
                    .setTitle('🌍 Country Guesser - Game Over')
                    .setDescription(`Final Score: **${score}/${maxRounds}**`)
                    .setColor(score >= 3 ? 0x4caf50 : 0xff9800);
                await i.editReply({ embeds: [finalEmbed], components: [] });
            } else {
                current = getRound();
                round++;

                setTimeout(async () => {
                    const newEmbed = new EmbedBuilder()
                        .setTitle('🌍 Country Guesser')
                        .setDescription(`Round **${round}/${maxRounds}**\n\n${current.correct.flag}\n\n**Which country is this?**`)
                        .setColor(0x2196f3)
                        .setFooter({ text: `Score: ${score}` });

                    const newRow = new ActionRowBuilder();
                    current.options.forEach(opt => {
                        newRow.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`country_${opt.name}`)
                                .setLabel(opt.name)
                                .setStyle(ButtonStyle.Secondary)
                        );
                    });

                    i.editReply({ embeds: [newEmbed], components: [newRow] });
                }, 2000);
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};
