const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll dice (supports NdN format, e.g., 2d6)')
    .addStringOption(option =>
      option.setName('dice').setDescription('Dice notation (e.g., 2d6, 1d20)').setRequired(false)
    ),
  cooldown: 3,
  aliases: ['roll'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const diceNotation = interaction.options?.getString('dice') || args?.[0] || '1d6';

            const match = diceNotation.match(/^(\d+)d(\d+)$/i);
            if (!match) {
              return interaction.reply({ embeds: [errorEmbed('Invalid dice format. Use NdN (e.g., 2d6).')] });
            }

            const numDice = parseInt(match[1]);
            const numSides = parseInt(match[2]);

            if (numDice < 1 || numDice > 100 || numSides < 2 || numSides > 100) {
              return interaction.reply({ embeds: [errorEmbed('Please provide valid dice values (1-100 dice, 2-100 sides).')] });
            }

            const rolls = [];
            let total = 0;

            for (let i = 0; i < numDice; i++) {
              const roll = Math.floor(Math.random() * numSides) + 1;
              rolls.push(roll);
              total += roll;
            }

            const embed = successEmbed('Dice Roll')
              .setDescription(`🎲 **${diceNotation}**`)
              .addField('Rolls', `[${rolls.join(', ')}]`, true)
              .addField('Total', `${total}`, true)
              .setColor(0xFF0000);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};