const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'typerace',
    description: 'Type the shown text as fast as you can',
    aliases: ['tr'],
    options: [],

    async execute(interaction) {
        const sentences = [
            'The quick brown fox jumps over the lazy dog',
            'Pack my box with five dozen liquor jugs',
            'How vexingly quick daft zebras jump',
            'The five boxing wizards jump quickly',
            'Sphinx of black quartz judge my vow',
            'Two driven jocks help fax my big quiz',
            'The jay, pig, fox, zebra, and my wolves quack',
            'Jackdaws love my big sphinx of quartz',
            'Mr Jock, TV quiz PhD, bags few lynx',
            'Crazy Frederick bought many very exquisite opal jewels'
        ];

        const sentence = sentences[Math.floor(Math.random() * sentences.length)];

        const embed = new EmbedBuilder()
            .setTitle('⌨️ Type Race')
            .setDescription(`Type this sentence as fast as you can:\n\n**${sentence}**\n\nYou have **30 seconds**!`)
            .setColor(0x00bcd4)
            .setFooter({ text: 'Type your answer in chat' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('typerace_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        const msg = await interaction.reply({ embeds: [embed], components: [row] });

        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 30000 });

        let startTime = Date.now();
        let finished = false;

        const btnCollector = msg.createMessageComponentCollector({ time: 30000 });
        btnCollector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'This is not your game!', ephemeral: true });
            }
            if (i.customId === 'typerace_cancel') {
                finished = true;
                collector.stop();
                btnCollector.stop();
                const cancelEmbed = new EmbedBuilder()
                    .setTitle('⌨️ Type Race - Cancelled')
                    .setDescription('Game cancelled.')
                    .setColor(0xff0000);
                i.update({ embeds: [cancelEmbed], components: [] });
            }
        });

        collector.on('collect', async (m) => {
            if (finished) return;

            const timeTaken = Date.now() - startTime;
            const isCorrect = m.content.toLowerCase() === sentence.toLowerCase();
            const wordsPerMinute = Math.round((sentence.split(' ').length / (timeTaken / 1000)) * 60);

            if (isCorrect) {
                finished = true;
                collector.stop();

                const resultEmbed = new EmbedBuilder()
                    .setTitle('⌨️ Type Race - Complete!')
                    .setDescription(`✅ Correct!\n\nTime: **${timeTaken}ms**\nSpeed: **${wordsPerMinute} WPM**`)
                    .setColor(0x4caf50);

                await interaction.editReply({ embeds: [resultEmbed], components: [] });
            } else {
                const failEmbed = new EmbedBuilder()
                    .setTitle('⌨️ Type Race')
                    .setDescription(`❌ Wrong! Try again.\n\n**${sentence}**`)
                    .setColor(0xff9800);

                await m.reply({ embeds: [failEmbed] }).then(() => m.delete().catch(() => {}));
            }
        });

        collector.on('end', (collected) => {
            if (!finished) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('⌨️ Type Race - Time Up!')
                    .setDescription(`You ran out of time!\n\nThe sentence was:\n**${sentence}**`)
                    .setColor(0xff0000);
                interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
            }
        });
    }
};
