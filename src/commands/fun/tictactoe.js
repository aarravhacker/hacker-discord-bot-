const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const activeGames = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('Play tic tac toe')
    .addUserOption(option =>
      option.setName('opponent').setDescription('The user to play against').setRequired(false)
    ),
  cooldown: 10,
  aliases: ['tictactoe', 'ttt'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = interaction.isChatInputCommand?.() || false;
            const user = isSlash ? interaction.user : interaction.author;
            const userId = user.id;
            const guildId = interaction.guild?.id;
            const gameKey = `${userId}_${guildId}`;

            if (activeGames.has(gameKey)) {
              return interaction.reply({ embeds: [errorEmbed('You already have an active tic tac toe game!')] });
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

            const board = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
            const game = {
              board: ['', '', '', '', '', '', '', '', ''],
              players: [userId, opponent.id],
              symbols: ['❌', '⭕'],
              currentTurn: 0,
              active: true
            };

            activeGames.set(gameKey, game);

            const displayBoard = game.board.map((cell, i) => cell || ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'][i]).join(' ');

            const embed = successEmbed('Tic Tac Toe')
              .setDescription(`${displayBoard}\n\n**${user.username}** (❌) vs **${opponent.username}** (⭕)\n\nCurrent turn: ${user.username}`)
              .setColor(0x5865F2);

            const row1 = new ActionRowBuilder();
            const row2 = new ActionRowBuilder();
            const row3 = new ActionRowBuilder();

            for (let i = 0; i < 3; i++) {
              row1.addComponents(
                new ButtonBuilder()
                  .setCustomId(`ttt_${gameKey}_${i}`)
                  .setLabel(['1️⃣', '2️⃣', '3️⃣'][i])
                  .setStyle(ButtonStyle.Secondary)
              );
            }

            for (let i = 3; i < 6; i++) {
              row2.addComponents(
                new ButtonBuilder()
                  .setCustomId(`ttt_${gameKey}_${i}`)
                  .setLabel(['4️⃣', '5️⃣', '6️⃣'][i - 3])
                  .setStyle(ButtonStyle.Secondary)
              );
            }

            for (let i = 6; i < 9; i++) {
              row3.addComponents(
                new ButtonBuilder()
                  .setCustomId(`ttt_${gameKey}_${i}`)
                  .setLabel(['7️⃣', '8️⃣', '9️⃣'][i - 6])
                  .setStyle(ButtonStyle.Secondary)
              );
            }

            const reply = await interaction.reply({ embeds: [embed], components: [row1, row2, row3], fetchReply: true });

            const collector = reply.createMessageComponentCollector({
              filter: (i) => [userId, opponent.id].includes(i.user.id) && i.customId.startsWith(`ttt_${gameKey}_`),
              time: 120000
            });

            collector.on('collect', async (i) => {
              if (i.user.id !== game.players[game.currentTurn]) {
                return i.reply({ content: 'It\'s not your turn!', ephemeral: true });
              }

              const position = parseInt(i.customId.split('_').pop());

              if (game.board[position] !== '') {
                return i.reply({ content: 'That position is already taken!', ephemeral: true });
              }

              game.board[position] = game.symbols[game.currentTurn];

              const winPatterns = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8],
                [0, 3, 6], [1, 4, 7], [2, 5, 8],
                [0, 4, 8], [2, 4, 6]
              ];

              let winner = null;
              for (const pattern of winPatterns) {
                if (game.board[pattern[0]] && game.board[pattern[0]] === game.board[pattern[1]] && game.board[pattern[1]] === game.board[pattern[2]]) {
                  winner = game.currentTurn;
                  break;
                }
              }

              if (winner !== null) {
                game.active = false;
                activeGames.delete(gameKey);

                const winnerUser = interaction.client.users.cache.get(game.players[winner]);
                const winEmbed = successEmbed('Tic Tac Toe - Winner!')
                  .setDescription(`${winnerUser.username} (${game.symbols[winner]}) wins!`)
                  .setColor(0x00FF00);

                await i.update({ embeds: [winEmbed], components: [] });
                collector.stop();
                return;
              }

              if (!game.board.includes('')) {
                game.active = false;
                activeGames.delete(gameKey);

                const drawEmbed = successEmbed('Tic Tac Toe - Draw!')
                  .setDescription('It\'s a draw!')
                  .setColor(0xFFD700);

                await i.update({ embeds: [drawEmbed], components: [] });
                collector.stop();
                return;
              }

              game.currentTurn = game.currentTurn === 0 ? 1 : 0;
              const currentPlayer = interaction.client.users.cache.get(game.players[game.currentTurn]);

              const displayBoard = game.board.map((cell, idx) => cell || ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'][idx]).join(' ');

              const embed = successEmbed('Tic Tac Toe')
                .setDescription(`${displayBoard}\n\n**${user.username}** (❌) vs **${opponent.username}** (⭕)\n\nCurrent turn: ${currentPlayer.username}`)
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