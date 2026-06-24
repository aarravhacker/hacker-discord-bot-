const { SlashCommandBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpmultiplier')
    .setDescription('Set the XP multiplier for the server')
    .addNumberOption(option =>
      option.setName('multiplier').setDescription('XP multiplier (0.1 to 5.0)').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['xpmultiplier', 'xpmult'],
  prefix: true,
  async execute(interaction, args) {
    if (!interaction.member?.permissions?.has('MANAGE_GUILD')) {
      return interaction.reply({ embeds: [errorEmbed('You need Manage Server permission.')] });
    }

    const guildId = interaction.guild?.id;
    const multiplier = interaction.options?.getNumber('multiplier') || parseFloat(args?.[0]);

    if (!multiplier || multiplier < 0.1 || multiplier > 5.0) {
      return interaction.reply({ embeds: [errorEmbed('Please provide a multiplier between 0.1 and 5.0.')] });
    }

    try {
      await updateGuild(guildId, { xp_multiplier: multiplier });

      const embed = successEmbed('XP Multiplier Updated')
        .setDescription(`XP multiplier set to **${multiplier}x**.`)
        .setColor(0x00FF00);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while setting XP multiplier.')] });
    }
  }
};
