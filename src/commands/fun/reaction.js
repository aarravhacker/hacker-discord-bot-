const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'reaction',
    description: 'Test your reaction speed',
    aliases: ['rtt', 'reactiontime'],
    options: [],

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('⚡ Reaction Speed Test')
            .setDescription('Click the button as fast as you can when it turns **GREEN**!')
            .setColor(0xff9800);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('reaction_wait')
                .setLabel('Wait...')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );

        const msg = await interaction.reply({ embeds: [embed], components: [row] });
        const collector = msg.createMessageComponentCollector({ time: 30000 });

        let waiting = false;
        let startTime = null;

        const delay = Math.random() * 5000 + 2000;

        setTimeout(async () => {
            waiting = true;
            startTime = Date.now();

            const readyEmbed = new EmbedBuilder()
                .setTitle('⚡ Reaction Speed Test')
                .setDescription('**CLICK NOW!**')
                .setColor(0x4caf50);

            const readyRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('reaction_click')
                    .setLabel('CLICK!')
                    .setStyle(ButtonStyle.Success)
            );

            await msg.edit({ embeds: [readyEmbed], components: [readyRow] });
        }, delay);

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'This is not your game!', ephemeral: true });
            }

            if (!waiting) {
                return i.reply({ content: 'You clicked too early! Wait for green.', ephemeral: true });
            }

            const reactionTime = Date.now() - startTime;
            waiting = false;

            let color, rating;
            if (reactionTime < 200) { color = 0x00e5ff; rating = 'Inhuman!'; }
            else if (reactionTime < 300) { color = 0x4caf50; rating = 'Excellent!'; }
            else if (reactionTime < 400) { color = 0x8bc34a; rating = 'Good!'; }
            else if (reactionTime < 500) { color = 0xffeb3b; rating = 'Average'; }
            else { color = 0xff9800; rating = 'Slow'; }

            const resultEmbed = new EmbedBuilder()
                .setTitle('⚡ Reaction Speed Test')
                .setDescription(`Your reaction time: **${reactionTime}ms**\n\nRating: **${rating}**`)
                .setColor(color);

            const retryRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('reaction_retry')
                    .setLabel('Try Again')
                    .setStyle(ButtonStyle.Primary)
            );

            collector.stop();
            i.update({ embeds: [resultEmbed], components: [retryRow] });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};
