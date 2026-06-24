const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { updateGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setmuterole')
    .setDescription('Set the mute role for the server')
    .addRoleOption(option => option.setName('role').setDescription('The role to use for muting').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 10,
  aliases: ['smr'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const role = isSlash ? interaction.options?.getRole('role') : interaction.guild.roles.cache.get(args?.[0]?.replace(/[<>@&]/g, ''));

    if (!role) return interaction.reply({ embeds: [errorEmbed('Please provide a valid role.')] });

    try {
      await updateGuild(interaction.guild.id, { mute_role: role.id });

      return interaction.reply({ embeds: [successEmbed(`Successfully set the mute role to ${role}.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while setting the mute role.')] });
    }
  }
};
