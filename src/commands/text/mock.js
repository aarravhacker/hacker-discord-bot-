const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mock')
    .setDescription('Mock text alternating caps')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to mock').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['spongebob', 'moctext', 'alternating'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const text = args?.join(' ') || interaction.options?.getString('text');
            if (!text) {
              return interaction.reply({ embeds: [createEmbed('⚠️ Please provide text to mock.', 'warning')] });
            }
            const mocked = text.split('').map((c, i) =>
              i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()
            ).join('');
            interaction.reply({ embeds: [createEmbed(`mock: ${mocked}`, 'info')] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};