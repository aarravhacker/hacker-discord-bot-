const { SlashCommandBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed, warningEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setxprole')
    .setDescription('Set an XP reward role for reaching a level')
    .addIntegerOption(option =>
      option.setName('level').setDescription('The level to unlock the role').setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role').setDescription('The role to reward').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['setxprole'],
  prefix: true,
  async execute(interaction, args) {
    if (!interaction.member?.permissions?.has('MANAGE_GUILD')) {
      return interaction.reply({ embeds: [errorEmbed('You need Manage Server permission.')] });
    }

    const guildId = interaction.guild?.id;
    const level = interaction.options?.getInteger('level') || parseInt(args?.[0]);
    const role = interaction.options?.getRole('role') || interaction.mentions?.roles?.first();

    if (!level || level < 1 || level > 100) {
      return interaction.reply({ embeds: [errorEmbed('Please provide a valid level (1-100).')] });
    }

    if (!role) {
      return interaction.reply({ embeds: [errorEmbed('Please provide a valid role.')] });
    }

    try {
      const guild = await getGuild(guildId);
      const xpRoles = guild.xp_roles || {};
      xpRoles[level] = role.id;

      await updateGuild(guildId, { xp_roles: xpRoles });

      const embed = successEmbed('XP Role Set')
        .setDescription(`Role ${role} will be granted at level ${level}.`)
        .setColor(0x00FF00);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while setting XP role.')] });
    }
  }
};
