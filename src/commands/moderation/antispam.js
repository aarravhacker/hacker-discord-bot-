const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispam')
    .setDescription('Toggle anti-spam protection')
    .addBooleanOption(option => option.setName('enabled').setDescription('Enable or disable anti-spam').setRequired(true))
    .addIntegerOption(option => option.setName('threshold').setDescription('Number of messages before action (default: 5)').setMinValue(1).setMaxValue(20))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 10,
  aliases: ['as'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const enabled = isSlash ? interaction.options?.getBoolean('enabled') : (args?.[0]?.toLowerCase() === 'on' || args?.[0]?.toLowerCase() === 'true');
    const threshold = isSlash ? interaction.options?.getInteger('threshold') : (parseInt(args?.[1]) || 5);

    try {
      await updateGuild(interaction.guild.id, {
        antispam_enabled: enabled,
        antispam_threshold: threshold
      });

      return interaction.reply({ embeds: [successEmbed(`Anti-spam has been ${enabled ? '**enabled**' : '**disabled**'} with a threshold of ${threshold} messages.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while toggling anti-spam.')] });
    }
  }
};
