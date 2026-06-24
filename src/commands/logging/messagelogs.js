const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { createEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('messagelogs')
    .setDescription('View recent message logs')
    .addIntegerOption(opt =>
      opt.setName('count').setDescription('Number of logs to show (1-25)').setMinValue(1).setMaxValue(25).setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['msglogs'],
  prefix: true,
  async execute(interaction, args) {
    const count = interaction.options?.getInteger('count') || (args && parseInt(args[0])) || 10;

    try {
      const db = getDB();
      const logs = await db('message_logs')
        .where({ guild_id: interaction.guildId })
        .orderBy('created_at', 'desc')
        .limit(count);

      if (!logs.length) {
        return interaction.reply({ embeds: [infoEmbed('No Logs', 'No message logs found.')] });
      }

      const fields = logs.map(log => ({
        name: `${log.action} by ${log.user_tag || 'Unknown'}`,
        value: `Channel: <#${log.channel_id}> | ${log.content ? log.content.substring(0, 100) : 'No content'}\n<t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>`,
        inline: false
      }));

      const embed = createEmbed('Message Logs', '', config.embedColors.info)
        .addFields(fields);

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to fetch message logs.')] });
    }
  }
};
