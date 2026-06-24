const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'rps',
    description: 'Play Rock Paper Scissors against the bot',
    aliases: [],
    options: [
        {
            name: 'choice',
            type: 3,
            description: 'Your choice',
            required: true,
            choices: [
                { name: 'Rock', value: 'rock' },
                { name: 'Paper', value: 'paper' },
                { name: 'Scissors', value: 'scissors' }
            ]
        }
    ],

    async execute(interaction) {
        const userChoice = interaction.options.getString('choice');
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * 3)];

        const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };

        let result;
        if (userChoice === botChoice) {
            result = 'It\'s a **draw**!';
        } else if (
            (userChoice === 'rock' && botChoice === 'scissors') ||
            (userChoice === 'paper' && botChoice === 'rock') ||
            (userChoice === 'scissors' && botChoice === 'paper')
        ) {
            result = 'You **win**! 🎉';
        } else {
            result = 'You **lose**! 😢';
        }

        const embed = new EmbedBuilder()
            .setTitle('✊ Rock Paper Scissors')
            .setDescription(`${result}`)
            .addFields(
                { name: 'Your Choice', value: `${emojis[userChoice]} ${userChoice.charAt(0).toUpperCase() + userChoice.slice(1)}`, inline: true },
                { name: 'Bot Choice', value: `${emojis[botChoice]} ${botChoice.charAt(0).toUpperCase() + botChoice.slice(1)}`, inline: true }
            )
            .setColor(result.includes('win') ? 0x4caf50 : result.includes('lose') ? 0xff5722 : 0xffeb3b);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('rps_rock').setLabel('🪨 Rock').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rps_paper').setLabel('📄 Paper').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rps_scissors').setLabel('✂️ Scissors').setStyle(ButtonStyle.Secondary)
        );

        const msg = await interaction.reply({ embeds: [embed], components: [row] });
        const collector = msg.createMessageComponentCollector({ time: 30000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'This is not your game!', ephemeral: true });
            }

            const newChoice = i.customId.replace('rps_', '');
            const newBotChoice = choices[Math.floor(Math.random() * 3)];

            let newResult;
            if (newChoice === newBotChoice) {
                newResult = 'It\'s a **draw**!';
            } else if (
                (newChoice === 'rock' && newBotChoice === 'scissors') ||
                (newChoice === 'paper' && newBotChoice === 'rock') ||
                (newChoice === 'scissors' && newBotChoice === 'paper')
            ) {
                newResult = 'You **win**! 🎉';
            } else {
                newResult = 'You **lose**! 😢';
            }

            const newEmbed = new EmbedBuilder()
                .setTitle('✊ Rock Paper Scissors')
                .setDescription(`${newResult}`)
                .addFields(
                    { name: 'Your Choice', value: `${emojis[newChoice]} ${newChoice.charAt(0).toUpperCase() + newChoice.slice(1)}`, inline: true },
                    { name: 'Bot Choice', value: `${emojis[newBotChoice]} ${newBotChoice.charAt(0).toUpperCase() + newBotChoice.slice(1)}`, inline: true }
                )
                .setColor(newResult.includes('win') ? 0x4caf50 : newResult.includes('lose') ? 0xff5722 : 0xffeb3b);

            i.update({ embeds: [newEmbed], components: [row] });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};
