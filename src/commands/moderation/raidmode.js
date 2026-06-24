const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidmode')
    .setDescription('Toggle raid mode')
    .addBooleanOption(option => option.setName('enabled').setDescription('Enable or disable raid mode').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 10,
  aliases: ['rm'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const enabled = isSlash ? interaction.options?.getBoolean('enabled') : (args?.[0]?.toLowerCase() === 'on' || args?.[0]?.toLowerCase() === 'true');

    try {
      await updateGuild(interaction.guild.id, { raid_mode: enabled });

      return interaction.reply({ embeds: [successEmbed(`Raid mode has been ${enabled ? '**enabled**' : '**disabled'}.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while toggling raid mode.')] });
    }
  }
};
