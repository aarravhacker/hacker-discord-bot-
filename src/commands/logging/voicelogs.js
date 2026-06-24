const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed, createEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicelogs')
    .setDescription('View recent voice logs')
    .addIntegerOption(opt =>
      opt.setName('count').setDescription('Number of logs to show (1-25)').setMinValue(1).setMaxValue(25).setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['vclogs'],
  prefix: true,
  async execute(interaction, args) {
    const count = interaction.options?.getInteger('count') || (args && parseInt(args[0])) || 10;

    try {
      const db = getDB();
      const logs = await db('voice_logs')
        .where({ guild_id: interaction.guildId })
        .orderBy('created_at', 'desc')
        .limit(count);

      if (!logs.length) {
        return interaction.reply({ embeds: [infoEmbed('No Logs', 'No voice logs found.')] });
      }

      const fields = logs.map(log => ({
        name: `${log.action} - ${log.user_tag || 'Unknown'}`,
        value: log.channel_id ? `Channel: <#${log.channel_id}>` : 'No channel info',
        inline: false
      }));

      const embed = createEmbed('Voice Logs', '', config.embedColors.info)
        .addFields(fields);

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to fetch voice logs.')] });
    }
  }
};
