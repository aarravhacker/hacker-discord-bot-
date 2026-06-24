const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilink')
    .setDescription('Toggle anti-link protection')
    .addBooleanOption(option => option.setName('enabled').setDescription('Enable or disable anti-link').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 10,
  aliases: ['al'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const enabled = isSlash ? interaction.options?.getBoolean('enabled') : (args?.[0]?.toLowerCase() === 'on' || args?.[0]?.toLowerCase() === 'true');

    try {
      await updateGuild(interaction.guild.id, { antilink_enabled: enabled });

      return interaction.reply({ embeds: [successEmbed(`Anti-link has been ${enabled ? '**enabled**' : '**disabled**'}.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while toggling anti-link.')] });
    }
  }
};
