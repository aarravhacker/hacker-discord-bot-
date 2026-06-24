const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hotornot')
    .setDescription('Rate if something is hot or not')
    .addStringOption(option =>
      option.setName('thing').setDescription('What to rate').setRequired(false)
    ),
  cooldown: 3,
  aliases: ['hotornot'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const thing = interaction.options?.getString('thing') || args?.join(' ') || 'this';
            const isHot = Math.random() > 0.5;
            const rating = isHot ? Math.floor(Math.random() * 4) + 7 : Math.floor(Math.random() * 6) + 1;

            let result;
            let color;

            if (rating >= 8) {
              result = "🔥 HOT! Definitely hot!";
              color = 0xFF4500;
            } else if (rating >= 6) {
              result = "Warm. Pretty good!";
              color = 0xFF8C00;
            } else if (rating >= 4) {
              result = "😐 Meh. Not hot, not cold.";
              color = 0xFFD700;
            } else {
              result = "❄️ Not. Definitely not.";
              color = 0x00BFFF;
            }

            const embed = successEmbed('Hot or Not')
              .setDescription(`**${thing}**`)
              .addField('Result', result)
              .addField('Rating', `${rating}/10`)
              .setColor(color);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};