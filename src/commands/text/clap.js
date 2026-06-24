const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clap')
    .setDescription('Add 👏 between each word')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to clap-ify').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['clapify', '👏'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const text = args?.join(' ') || interaction.options?.getString('text');
            if (!text) {
              return interaction.reply({ embeds: [createEmbed('⚠️ Please provide text.', 'warning')] });
            }
            const result = text.split(/\s+/).join(' 👏 ');
            interaction.reply({ embeds: [createEmbed(result, 'info')] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};