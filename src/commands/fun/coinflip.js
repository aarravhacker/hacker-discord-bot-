const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin'),
  cooldown: 3,
  aliases: ['coinflip', 'flip', 'coin'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
            const emoji = result === 'Heads' ? '🪙' : '🪙';

            const embed = successEmbed('Coin Flip')
              .setDescription(`${emoji} **${result}!**`)
              .setColor(result === 'Heads' ? 0xFFD700 : 0xC0C0C0);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};