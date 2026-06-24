const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Toggle anti-raid protection')
    .addBooleanOption(option => option.setName('enabled').setDescription('Enable or disable anti-raid').setRequired(true))
    .addIntegerOption(option => option.setName('threshold').setDescription('Number of joins before action (default: 10)').setMinValue(1).setMaxValue(50))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 10,
  aliases: ['ar'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const enabled = isSlash ? interaction.options?.getBoolean('enabled') : (args?.[0]?.toLowerCase() === 'on' || args?.[0]?.toLowerCase() === 'true');
    const threshold = isSlash ? interaction.options?.getInteger('threshold') : (parseInt(args?.[1]) || 10);

    try {
      await updateGuild(interaction.guild.id, {
        antiraid_enabled: enabled,
        antiraid_threshold: threshold
      });

      return interaction.reply({ embeds: [successEmbed(`Anti-raid has been ${enabled ? '**enabled**' : '**disabled**'} with a threshold of ${threshold} joins.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while toggling anti-raid.')] });
    }
  }
};
