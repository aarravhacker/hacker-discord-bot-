const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const words = [
  'javascript', 'discord', 'programming', 'computer', 'algorithm',
  'function', 'variable', 'database', 'keyboard', 'monitor',
  'python', 'developer', 'software', 'hardware', 'network',
  'server', 'client', 'browser', 'website', 'internet'
];

const activeGames = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hangman')
    .setDescription('Play hangman'),
  cooldown: 10,
  aliases: ['hangman'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = interaction.isChatInputCommand?.() || false;
            const user = isSlash ? interaction.user : interaction.author;
            const userId = user.id;
            const guildId = interaction.guild?.id;
            const gameKey = `${userId}_${guildId}`;

            if (activeGames.has(gameKey)) {
              return interaction.reply({ embeds: [errorEmbed('You already have an active hangman game!')] });
            }

            const word = words[Math.floor(Math.random() * words.length)];
            const game = {
              word: word.toLowerCase(),
              guessed: [],
              wrongGuesses: 0,
              maxWrong: 6,
              active: true
            };

            activeGames.set(gameKey, game);

            const displayWord = game.word.split('').map(c => game.guessed.includes(c) ? c : '_').join(' ');

            const embed = successEmbed('Hangman')
              .setDescription(`**${displayWord}**`)
              .addField('Wrong Guesses', `${game.wrongGuesses}/${game.maxWrong}`)
              .addField('Guessed Letters', game.guessed.length > 0 ? game.guessed.join(', ') : 'None')
              .setColor(0x5865F2);

            const row = new ActionRowBuilder();
            const letters = 'abcdefghijklmnopqrstuvwxyz';
            for (let i = 0; i < 26; i++) {
              row.addComponents(
                new ButtonBuilder()
                  .setCustomId(`hangman_${gameKey}_${letters[i]}`)
                  .setLabel(letters[i].toUpperCase())
                  .setStyle(ButtonStyle.Secondary)
              );
            }

            const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

            const collector = reply.createMessageComponentCollector({
              filter: (i) => i.user.id === userId && i.customId.startsWith(`hangman_${gameKey}_`),
              time: 120000
            });

            collector.on('collect', async (i) => {
              const letter = i.customId.split('_').pop();

              if (game.guessed.includes(letter)) {
                return i.reply({ content: 'You already guessed that letter!', ephemeral: true });
              }

              game.guessed.push(letter);

              if (game.word.includes(letter)) {
                const displayWord = game.word.split('').map(c => game.guessed.includes(c) ? c : '_').join(' ');

                if (!displayWord.includes('_')) {
                  game.active = false;
                  activeGames.delete(gameKey);

                  const winEmbed = successEmbed('Hangman - You Won!')
                    .setDescription(`You guessed the word: **${game.word}**`)
                    .setColor(0x00FF00);

                  await i.update({ embeds: [winEmbed], components: [] });
                  collector.stop();
                  return;
                }

                const embed = successEmbed('Hangman')
                  .setDescription(`**${displayWord}**`)
                  .addField('Wrong Guesses', `${game.wrongGuesses}/${game.maxWrong}`)
                  .addField('Guessed Letters', game.guessed.join(', '))
                  .setColor(0x5865F2);

                await i.update({ embeds: [embed] });
              } else {
                game.wrongGuesses++;

                if (game.wrongGuesses >= game.maxWrong) {
                  game.active = false;
                  activeGames.delete(gameKey);

                  const loseEmbed = errorEmbed('Hangman - You Lost!')
                    .setDescription(`The word was: **${game.word}**`)
                    .setColor(0xFF0000);

                  await i.update({ embeds: [loseEmbed], components: [] });
                  collector.stop();
                  return;
                }

                const displayWord = game.word.split('').map(c => game.guessed.includes(c) ? c : '_').join(' ');
                const embed = successEmbed('Hangman')
                  .setDescription(`**${displayWord}**`)
                  .addField('Wrong Guesses', `${game.wrongGuesses}/${game.maxWrong}`)
                  .addField('Guessed Letters', game.guessed.join(', '))
                  .setColor(0xFF0000);

                await i.update({ embeds: [embed] });
              }
            });

            collector.on('end', () => {
              activeGames.delete(gameKey);
            });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};