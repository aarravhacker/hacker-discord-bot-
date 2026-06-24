const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pick')
    .setDescription('Pick a random option from a list')
    .addStringOption(option =>
      option.setName('options').setDescription('Options separated by , (e.g., red, blue, green)').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['pick'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const optionsStr = interaction.options?.getString('options') || args?.join(' ');
            const options = optionsStr?.split(',').map(o => o.trim()).filter(o => o);

            if (!options || options.length < 2) {
              return interaction.reply({ embeds: [errorEmbed('Please provide at least 2 options separated by commas.')] });
            }

            const picked = options[Math.floor(Math.random() * options.length)];

            const embed = successEmbed('Pick')
              .setDescription(`I pick: **${picked}**`)
              .addField('Options', options.map(o => `\`${o}\``).join(', '))
              .setColor(0x3498DB);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};