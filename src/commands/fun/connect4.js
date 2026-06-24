const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const activeGames = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('connect4')
    .setDescription('Play Connect 4')
    .addUserOption(option =>
      option.setName('opponent').setDescription('The user to play against').setRequired(true)
    ),
  cooldown: 15,
  aliases: ['connect4', 'c4'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = interaction.isChatInputCommand?.() || false;
            const user = isSlash ? interaction.user : interaction.author;
            const userId = user.id;
            const guildId = interaction.guild?.id;
            const gameKey = `${userId}_${guildId}`;

            if (activeGames.has(gameKey)) {
              return interaction.reply({ embeds: [errorEmbed('You already have an active Connect 4 game!')] });
            }

            const opponent = interaction.options?.getUser('opponent') || interaction.mentions?.users?.first();
            if (!opponent) {
              return interaction.reply({ embeds: [errorEmbed('Please mention an opponent to play against!')] });
            }

            if (opponent.id === userId) {
              return interaction.reply({ embeds: [errorEmbed('You cannot play against yourself!')] });
            }

            if (opponent.bot) {
              return interaction.reply({ embeds: [errorEmbed('You cannot play against a bot!')] });
            }

            const game = {
              board: Array(6).fill(null).map(() => Array(7).fill(0)),
              players: [userId, opponent.id],
              symbols: ['🔴', '🟡'],
              currentTurn: 0,
              active: true
            };

            activeGames.set(gameKey, game);

            const displayBoard = game.board.map(row =>
              row.map(cell => cell === 0 ? '⬛' : cell === 1 ? '🔴' : '🟡').join('')
            ).join('\n');

            const embed = successEmbed('Connect 4')
              .setDescription(`${displayBoard}\n\n**${user.username}** (🔴) vs **${opponent.username}** (🟡)\n\nCurrent turn: ${user.username}`)
              .setColor(0x5865F2);

            const row = new ActionRowBuilder();
            for (let i = 0; i < 7; i++) {
              row.addComponents(
                new ButtonBuilder()
                  .setCustomId(`c4_${gameKey}_${i}`)
                  .setLabel(`${i + 1}`)
                  .setStyle(ButtonStyle.Secondary)
              );
            }

            const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

            const collector = reply.createMessageComponentCollector({
              filter: (i) => [userId, opponent.id].includes(i.user.id) && i.customId.startsWith(`c4_${gameKey}_`),
              time: 300000
            });

            collector.on('collect', async (i) => {
              if (i.user.id !== game.players[game.currentTurn]) {
                return i.reply({ content: 'It\'s not your turn!', ephemeral: true });
              }

              const column = parseInt(i.customId.split('_').pop());

              let rowToPlace = -1;
              for (let r = 5; r >= 0; r--) {
                if (game.board[r][column] === 0) {
                  rowToPlace = r;
                  break;
                }
              }

              if (rowToPlace === -1) {
                return i.reply({ content: 'That column is full!', ephemeral: true });
              }

              game.board[rowToPlace][column] = game.currentTurn + 1;

              const checkWin = () => {
                for (let r = 0; r < 6; r++) {
                  for (let c = 0; c < 4; c++) {
                    if (game.board[r][c] && game.board[r][c] === game.board[r][c + 1] &&
                        game.board[r][c] === game.board[r][c + 2] && game.board[r][c] === game.board[r][c + 3]) {
                      return true;
                    }
                  }
                }

                for (let r = 0; r < 3; r++) {
                  for (let c = 0; c < 7; c++) {
                    if (game.board[r][c] && game.board[r][c] === game.board[r + 1][c] &&
                        game.board[r][c] === game.board[r + 2][c] && game.board[r][c] === game.board[r + 3][c]) {
                      return true;
                    }
                  }
                }

                for (let r = 0; r < 3; r++) {
                  for (let c = 0; c < 4; c++) {
                    if (game.board[r][c] && game.board[r][c] === game.board[r + 1][c + 1] &&
                        game.board[r][c] === game.board[r + 2][c + 2] && game.board[r][c] === game.board[r + 3][c + 3]) {
                      return true;
                    }
                  }
                }

                for (let r = 0; r < 3; r++) {
                  for (let c = 3; c < 7; c++) {
                    if (game.board[r][c] && game.board[r][c] === game.board[r + 1][c - 1] &&
                        game.board[r][c] === game.board[r + 2][c - 2] && game.board[r][c] === game.board[r + 3][c - 3]) {
                      return true;
                    }
                  }
                }

                return false;
              };

              const checkDraw = () => {
                return !game.board[0].includes(0);
              };

              if (checkWin()) {
                game.active = false;
                activeGames.delete(gameKey);

                const winnerUser = interaction.client.users.cache.get(game.players[game.currentTurn]);
                const winEmbed = successEmbed('Connect 4 - Winner!')
                  .setDescription(`${winnerUser.username} (${game.symbols[game.currentTurn]}) wins!`)
                  .setColor(0x00FF00);

                await i.update({ embeds: [winEmbed], components: [] });
                collector.stop();
                return;
              }

              if (checkDraw()) {
                game.active = false;
                activeGames.delete(gameKey);

                const drawEmbed = successEmbed('Connect 4 - Draw!')
                  .setDescription('It\'s a draw!')
                  .setColor(0xFFD700);

                await i.update({ embeds: [drawEmbed], components: [] });
                collector.stop();
                return;
              }

              game.currentTurn = game.currentTurn === 0 ? 1 : 0;
              const currentPlayer = interaction.client.users.cache.get(game.players[game.currentTurn]);

              const displayBoard = game.board.map(row =>
                row.map(cell => cell === 0 ? '⬛' : cell === 1 ? '🔴' : '🟡').join('')
              ).join('\n');

              const embed = successEmbed('Connect 4')
                .setDescription(`${displayBoard}\n\n**${user.username}** (🔴) vs **${opponent.username}** (🟡)\n\nCurrent turn: ${currentPlayer.username}`)
                .setColor(0x5865F2);

              await i.update({ embeds: [embed] });
            });

            collector.on('end', () => {
              activeGames.delete(gameKey);
            });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};