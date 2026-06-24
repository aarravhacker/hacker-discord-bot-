const { SlashCommandBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpboost')
    .setDescription('Activate a temporary XP boost')
    .addIntegerOption(option =>
      option.setName('duration').setDescription('Duration in minutes').setRequired(true)
    )
    .addNumberOption(option =>
      option.setName('multiplier').setDescription('Boost multiplier (1.5 to 3.0)').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['xpboost'],
  prefix: true,
  async execute(interaction, args) {
    if (!interaction.member?.permissions?.has('MANAGE_GUILD')) {
      return interaction.reply({ embeds: [errorEmbed('You need Manage Server permission.')] });
    }

    const guildId = interaction.guild?.id;
    const duration = interaction.options?.getInteger('duration') || parseInt(args?.[0]);
    const multiplier = interaction.options?.getNumber('multiplier') || parseFloat(args?.[1]);

    if (!duration || duration < 1 || duration > 1440) {
      return interaction.reply({ embeds: [errorEmbed('Duration must be between 1 and 1440 minutes.')] });
    }

    if (!multiplier || multiplier < 1.5 || multiplier > 3.0) {
      return interaction.reply({ embeds: [errorEmbed('Multiplier must be between 1.5 and 3.0.')] });
    }

    try {
      const boostEnd = Date.now() + (duration * 60 * 1000);
      await updateGuild(guildId, {
        xp_boost_multiplier: multiplier,
        xp_boost_end: boostEnd
      });

      const embed = successEmbed('XP Boost Activated')
        .setDescription(`XP boost of **${multiplier}x** activated for **${duration} minutes**!`)
        .setColor(0xFFD700);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while activating XP boost.')] });
    }
  }
};
