const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicelogexport')
    .setDescription('Export voice logs to a file')
    .addIntegerOption(opt =>
      opt.setName('count').setDescription('Number of logs to export').setMinValue(1).setMaxValue(1000).setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 30,
  aliases: ['vclogexport'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const count = isSlash ? (interaction.options?.getInteger('count') || 100) : (args && parseInt(args[0]) || 100);

    if (isSlash) {
      await interaction.deferReply();
    } else {
      await interaction.channel.sendTyping();
    }

    try {
      const db = getDB();
      const logs = await db('voice_logs')
        .where({ guild_id: interaction.guildId })
        .orderBy('created_at', 'desc')
        .limit(count);

      if (!logs.length) {
        const data = { embeds: [errorEmbed('No Logs', 'No voice logs to export.')] };
        return isSlash ? interaction.editReply(data) : interaction.reply(data);
      }

      const csv = ['Timestamp,User,Action,Channel'];
      for (const log of logs) {
        csv.push(`${log.created_at},${log.user_tag || 'Unknown'},${log.action},${log.channel_id || 'N/A'}`);
      }

      const buffer = Buffer.from(csv.join('\n'), 'utf-8');
      const attachment = new AttachmentBuilder(buffer, { name: `voice-logs-${Date.now()}.csv` });

      const data = {
        embeds: [successEmbed('Export Complete', `Exported ${logs.length} voice logs.`)],
        files: [attachment]
      };
      return isSlash ? interaction.editReply(data) : interaction.reply(data);
    } catch (err) {
      const data = { embeds: [errorEmbed('Error', 'Failed to export voice logs.')] };
      return isSlash ? interaction.editReply(data) : interaction.reply(data);
    }
  }
};
