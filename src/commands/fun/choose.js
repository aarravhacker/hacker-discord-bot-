const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('choose')
    .setDescription('Choose between options')
    .addStringOption(option =>
      option.setName('options').setDescription('Options separated by | (e.g., pizza|pasta|burger)').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['choose'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const optionsStr = interaction.options?.getString('options') || args?.join(' ');
            const options = optionsStr?.split('|').map(o => o.trim()).filter(o => o);

            if (!options || options.length < 2) {
              return interaction.reply({ embeds: [errorEmbed('Please provide at least 2 options separated by |')] });
            }

            const chosen = options[Math.floor(Math.random() * options.length)];

            const embed = successEmbed('Choice Made')
              .setDescription(`I choose: **${chosen}**`)
              .addField('Options', options.map(o => `\`${o}\``).join(', '))
              .setColor(0x9B59B6);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};