const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'akinator',
    description: 'Play an Akinator-style guessing game',
    aliases: [],
    options: [],

    async execute(interaction) {
        const questions = [
            { q: 'Is your character real?', yes: 'Is your character from a movie?', no: 'Is your character from a book?' },
            { q: 'Is your character male?', yes: 'Is your character an adult?', no: 'Is your character female?' },
            { q: 'Is your character from a movie?', yes: 'Is your character the main character?', no: 'Is your character a villain?' },
            { q: 'Is your character from a book?', yes: 'Is your character a fictional character?', no: 'Is your character from a game?' },
            { q: 'Is your character a villain?', yes: 'Does your character have superpowers?', no: 'Is your character a hero?' },
            { q: 'Does your character have superpowers?', yes: 'Is your character from a superhero movie?', no: 'Is your character a wizard?' },
            { q: 'Is your character a wizard?', yes: 'Is your character from a fantasy series?', no: 'Is your character from anime?' },
            { q: 'Is your character from anime?', yes: 'Is your character from a video game?', no: 'Is your character from a TV show?' },
            { q: 'Is your character from a video game?', yes: 'Is your character human?', no: 'Is your character a robot?' },
            { q: 'Is your character human?', yes: 'I think I know who it is!', no: 'Is your character an animal?' }
        ];

        const guesses = [
            'Harry Potter', 'Gandalf', 'Spider-Man', 'Batman', 'Darth Vader',
            'Mario', 'Link', 'Pikachu', 'Sherlock Holmes', 'Ronald McDonald',
            'Elsa', 'Naruto', 'Goku', 'Sonic', 'Pac-Man'
        ];

        let step = 0;
        let score = 0;

        const embed = new EmbedBuilder()
            .setTitle('🔮 Akinator')
            .setDescription(`Think of a character, and I'll try to guess it!\n\n**${questions[0].q}**`)
            .setColor(0x7b1fa2)
            .setFooter({ text: `Step 1/${questions.length}` });

        const row = getButtonRow();

        const msg = await interaction.reply({ embeds: [embed], components: [row] });
        const collector = msg.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'This is not your game!', ephemeral: true });
            }

            const answer = i.customId;

            if (answer === 'akinator_end') {
                const cancelEmbed = new EmbedBuilder()
                    .setTitle('🔮 Akinator - Cancelled')
                    .setDescription('Game cancelled.')
                    .setColor(0xff0000);
                collector.stop();
                return i.update({ embeds: [cancelEmbed], components: [] });
            }

            if (answer === 'akinator_yes') score += 2;
            else score += 1;

            step++;

            if (step >= questions.length || score >= questions.length * 1.5) {
                const guess = guesses[Math.floor(Math.random() * guesses.length)];
                const winEmbed = new EmbedBuilder()
                    .setTitle('🔮 Akinator')
                    .setDescription(`I guess your character is **${guess}**!\n\nWas I right?`)
                    .setColor(0x4caf50);

                const confirmRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('akinator_right').setLabel('Yes!').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('akinator_wrong').setLabel('No').setStyle(ButtonStyle.Danger)
                );

                collector.stop();
                return i.update({ embeds: [winEmbed], components: [confirmRow] });
            }

            const nextQ = questions[step];
            const newEmbed = new EmbedBuilder()
                .setTitle('🔮 Akinator')
                .setDescription(`**${nextQ.q}**`)
                .setColor(0x7b1fa2)
                .setFooter({ text: `Step ${step + 1}/${questions.length}` });

            i.update({ embeds: [newEmbed], components: [getButtonRow()] });
        });

        collector.on('end', (collected) => {
            const last = collected.last();
            if (!last) return;

            if (last.customId === 'akinator_right') {
                const correctEmbed = new EmbedBuilder()
                    .setTitle('🔮 Akinator - I Win!')
                    .setDescription('I guessed your character correctly!')
                    .setColor(0x4caf50);
                last.update({ embeds: [correctEmbed], components: [] }).catch(() => {});
            } else if (last.customId === 'akinator_wrong') {
                const wrongEmbed = new EmbedBuilder()
                    .setTitle('🔮 Akinator - You Win!')
                    .setDescription('I couldn\'t guess your character. You win!')
                    .setColor(0xff9800);
                last.update({ embeds: [wrongEmbed], components: [] }).catch(() => {});
            }
        });
    }
};

function getButtonRow() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('akinator_yes').setLabel('Yes').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('akinator_no').setLabel('No').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('akinator_end').setLabel('End').setStyle(ButtonStyle.Secondary)
        );
}
