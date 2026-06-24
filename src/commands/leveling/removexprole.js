const { SlashCommandBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removexprole')
    .setDescription('Remove an XP reward role')
    .addIntegerOption(option =>
      option.setName('level').setDescription('The level to remove the role from').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['removexprole'],
  prefix: true,
  async execute(interaction, args) {
    if (!interaction.member?.permissions?.has('MANAGE_GUILD')) {
      return interaction.reply({ embeds: [errorEmbed('You need Manage Server permission.')] });
    }

    const guildId = interaction.guild?.id;
    const level = interaction.options?.getInteger('level') || parseInt(args?.[0]);

    if (!level || level < 1 || level > 100) {
      return interaction.reply({ embeds: [errorEmbed('Please provide a valid level (1-100).')] });
    }

    try {
      const guild = await getGuild(guildId);
      const xpRoles = guild.xp_roles || {};

      if (!xpRoles[level]) {
        return interaction.reply({ embeds: [errorEmbed(`No XP role set for level ${level}.`)] });
      }

      delete xpRoles[level];
      await updateGuild(guildId, { xp_roles: xpRoles });

      const embed = successEmbed('XP Role Removed')
        .setDescription(`XP role for level ${level} has been removed.`)
        .setColor(0xFF0000);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while removing XP role.')] });
    }
  }
};
