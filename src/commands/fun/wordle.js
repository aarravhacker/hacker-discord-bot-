const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'wordle',
    description: 'Play Wordle with 6 guesses',
    aliases: [],
    options: [],

    async execute(interaction) {
        const words = [
            'apple', 'beach', 'blame', 'blaze', 'blown', 'brace', 'brain', 'brake',
            'brave', 'bread', 'break', 'brick', 'bride', 'brief', 'bring', 'broad',
            'brook', 'brown', 'brush', 'build', 'burst', 'buyer', 'cabin', 'cable',
            'camel', 'candy', 'cargo', 'carry', 'catch', 'cause', 'chain', 'chair',
            'chase', 'cheap', 'check', 'cheek', 'cheer', 'chess', 'chest', 'chief',
            'child', 'chill', 'china', 'choir', 'chunk', 'claim', 'clash', 'class',
            'clean', 'clear', 'climb', 'cling', 'clock', 'clone', 'close', 'cloud',
            'coach', 'coast', 'coral', 'could', 'count', 'court', 'cover', 'crack',
            'craft', 'crane', 'crash', 'crawl', 'crazy', 'cream', 'cross', 'crowd',
            'crown', 'cruel', 'crush', 'curve', 'cycle', 'dance', 'debug', 'decay',
            'delay', 'delta', 'demon', 'depth', 'derby', 'devil', 'diary', 'dirty',
            'dodge', 'doubt', 'draft', 'drain', 'drake', 'drama', 'drank', 'drawn',
            'dream', 'dress', 'drift', 'drink', 'drive', 'droit', 'drone', 'drown',
            'dying', 'eager', 'eagle', 'early', 'earth', 'eight', 'elder', 'elect',
            'elite', 'ember', 'empty', 'enemy', 'enjoy', 'enter', 'equal', 'error',
            'event', 'every', 'exact', 'exams', 'exile', 'extra', 'fable', 'faith',
            'false', 'fancy', 'fault', 'feast', 'fetch', 'fever', 'fewer', 'fiber',
            'field', 'fifth', 'fight', 'final', 'first', 'flame', 'flash', 'fleet',
            'flesh', 'float', 'flood', 'floor', 'flour', 'fluid', 'flush', 'focus',
            'force', 'forge', 'forth', 'forum', 'found', 'frame', 'frank', 'fraud',
            'fresh', 'front', 'frost', 'fruit', 'fungi', 'gauge', 'giant', 'given',
            'gland', 'glass', 'gleam', 'globe', 'gloom', 'glory', 'glove', 'going',
            'grace', 'grade', 'grain', 'grand', 'grant', 'graph', 'grasp', 'grass',
            'grave', 'great', 'greed', 'green', 'greet', 'grief', 'grill', 'grind',
            'groan', 'gross', 'group', 'grove', 'grown', 'guard', 'guess', 'guest',
            'guide', 'guild', 'guilt', 'piano', 'pizza', 'pilot', 'pixel', 'place',
            'plain', 'plane', 'plant', 'plate', 'plaza', 'plead', 'plumb', 'plump',
            'point', 'pound', 'power', 'press', 'price', 'pride', 'prime', 'print',
            'prior', 'prize', 'probe', 'prone', 'proof', 'proud', 'prove', 'proxy',
            'pulse', 'punch', 'pupil', 'queen', 'query', 'quest', 'queue', 'quick',
            'quiet', 'quite', 'quota', 'quote', 'radar', 'radio', 'raise', 'rally',
            'ranch', 'range', 'rapid', 'ratio', 'reach', 'react', 'ready', 'realm',
            'rebel', 'refer', 'reign', 'relax', 'repay', 'reply', 'rider', 'ridge',
            'rifle', 'right', 'rigid', 'risky', 'rival', 'river', 'robot', 'rocky',
            'rouge', 'rough', 'round', 'route', 'royal', 'rugby', 'ruler', 'rural',
            'salad', 'sandy', 'sauce', 'scale', 'scare', 'scene', 'scent', 'score',
            'scout', 'scrap', 'sense', 'serve', 'seven', 'shade', 'shake', 'shame',
            'shape', 'share', 'shark', 'sharp', 'sheep', 'sheer', 'sheet', 'shelf',
            'shell', 'shift', 'shine', 'shirt', 'shock', 'shore', 'short', 'shout',
            'sight', 'sigma', 'since', 'sixth', 'sixty', 'sized', 'skill', 'skull',
            'slate', 'slave', 'sleep', 'slice', 'slide', 'small', 'smart', 'smell',
            'smile', 'smoke', 'snake', 'solar', 'solid', 'solve', 'sorry', 'south',
            'space', 'spare', 'spark', 'speak', 'speed', 'spend', 'spice', 'spike',
            'spine', 'split', 'spoke', 'sport', 'spray', 'squad', 'stack', 'staff',
            'stage', 'stain', 'stake', 'stale', 'stall', 'stamp', 'stand', 'stare',
            'start', 'state', 'stave', 'steal', 'steam', 'steel', 'steep', 'steer',
            'stern', 'stick', 'stiff', 'still', 'stock', 'stone', 'stood', 'store',
            'storm', 'story', 'stout', 'stove', 'strip', 'stuck', 'stuff', 'style',
            'sugar', 'super', 'surge', 'swamp', 'swarm', 'swear', 'sweep', 'sweet',
            'swell', 'swept', 'swift', 'swing', 'swirl', 'sword', 'swore', 'sworn',
            'swung', 'table', 'taken', 'taste', 'teach', 'tempo', 'thank', 'their',
            'theme', 'thick', 'thing', 'think', 'third', 'thorn', 'those', 'three',
            'threw', 'throw', 'thumb', 'tiger', 'tight', 'tired', 'title', 'today',
            'token', 'topic', 'total', 'touch', 'tough', 'towel', 'tower', 'toxic',
            'trace', 'track', 'trade', 'trail', 'train', 'trait', 'trash', 'treat',
            'trend', 'trial', 'tribe', 'trick', 'tried', 'trout', 'truck', 'truly',
            'trump', 'trunk', 'trust', 'truth', 'tumor', 'twice', 'twist', 'ultra',
            'uncle', 'under', 'union', 'unite', 'unity', 'until', 'upper', 'upset',
            'urban', 'usage', 'usual', 'utter', 'valid', 'value', 'vapor', 'vault',
            'venue', 'verse', 'video', 'vigor', 'vinyl', 'viral', 'virus', 'visit',
            'vista', 'vital', 'vivid', 'vocal', 'vodka', 'voice', 'voter', 'wages',
            'waste', 'watch', 'water', 'weary', 'weave', 'wheat', 'wheel', 'where',
            'which', 'while', 'white', 'whole', 'whose', 'width', 'witch', 'woman',
            'world', 'worry', 'worse', 'worst', 'worth', 'would', 'wound', 'wrath',
            'write', 'wrong', 'wrote', 'yacht', 'yield', 'young', 'yours', 'youth'
        ];

        const word = words[Math.floor(Math.random() * words.length)];
        let guesses = [];
        const maxGuesses = 6;

        function getGuessDisplay() {
            const display = [];
            for (let i = 0; i < maxGuesses; i++) {
                if (i < guesses.length) {
                    const guess = guesses[i];
                    let row = '';
                    for (let j = 0; j < 5; j++) {
                        if (guess[j] === word[j]) {
                            row += `🟩`;
                        } else if (word.includes(guess[j])) {
                            row += `🟨`;
                        } else {
                            row += `⬛`;
                        }
                    }
                    display.push(`${row} ${guess.toUpperCase()}`);
                } else {
                    display.push('⬜⬜⬜⬜⬜ ????');
                }
            }
            return display.join('\n');
        }

        const embed = new EmbedBuilder()
            .setTitle('📝 Wordle')
            .setDescription(`Guess the 5-letter word!\n\n${getGuessDisplay()}\n\nGuesses: **${guesses.length}/${maxGuesses}**`)
            .setColor(0x6aaa64)
            .setFooter({ text: 'Type your guess in chat' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('wordle_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        const msg = await interaction.reply({ embeds: [embed], components: [row] });

        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 120000 });

        const btnCollector = msg.createMessageComponentCollector({ time: 120000 });
        let finished = false;

        btnCollector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'This is not your game!', ephemeral: true });
            }
            if (i.customId === 'wordle_cancel') {
                finished = true;
                collector.stop();
                btnCollector.stop();
                const cancelEmbed = new EmbedBuilder()
                    .setTitle('📝 Wordle - Cancelled')
                    .setDescription(`The word was: **${word.toUpperCase()}**`)
                    .setColor(0xff0000);
                i.update({ embeds: [cancelEmbed], components: [] });
            }
        });

        collector.on('collect', async (m) => {
            if (finished) return;

            const guess = m.content.toLowerCase().trim();

            if (guess.length !== 5) {
                return m.reply({ content: 'Word must be 5 letters!', ephemeral: true }).then(() => m.delete().catch(() => {}));
            }

            guesses.push(guess);

            if (guess === word) {
                finished = true;
                collector.stop();
                const winEmbed = new EmbedBuilder()
                    .setTitle('📝 Wordle - You Win!')
                    .setDescription(`You guessed it in **${guesses.length}/${maxGuesses}** tries!\n\n${getGuessDisplay()}`)
                    .setColor(0x4caf50);
                await interaction.editReply({ embeds: [winEmbed], components: [] });
                m.delete().catch(() => {});
                return;
            }

            if (guesses.length >= maxGuesses) {
                finished = true;
                collector.stop();
                const loseEmbed = new EmbedBuilder()
                    .setTitle('📝 Wordle - Game Over')
                    .setDescription(`The word was: **${word.toUpperCase()}**\n\n${getGuessDisplay()}`)
                    .setColor(0xff0000);
                await interaction.editReply({ embeds: [loseEmbed], components: [] });
                m.delete().catch(() => {});
                return;
            }

            const newEmbed = new EmbedBuilder()
                .setTitle('📝 Wordle')
                .setDescription(`Guess the 5-letter word!\n\n${getGuessDisplay()}\n\nGuesses: **${guesses.length}/${maxGuesses}**`)
                .setColor(0x6aaa64)
                .setFooter({ text: 'Type your guess in chat' });

            await interaction.editReply({ embeds: [newEmbed], components: [row] });
            m.delete().catch(() => {});
        });

        collector.on('end', () => {
            if (!finished) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('📝 Wordle - Time Up!')
                    .setDescription(`The word was: **${word.toUpperCase()}**\n\n${getGuessDisplay()}`)
                    .setColor(0xff0000);
                interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
            }
        });
    }
};
