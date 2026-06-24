const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spongebob')
    .setDescription('Mock text in SpongeBob style')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to spongebob-ify').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['spob', 'mocktext'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const text = args?.join(' ') || interaction.options?.getString('text');
            if (!text) {
              return interaction.reply({ embeds: [createEmbed('⚠️ Please provide text.', 'warning')] });
            }
            const result = text.split('').map((c, i) => {
              if (c === ' ') return ' ';
              if (Math.random() > 0.5) return c.toUpperCase();
              return c.toLowerCase();
            }).join('');
            interaction.reply({ embeds: [createEmbed(result, 'info')] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};