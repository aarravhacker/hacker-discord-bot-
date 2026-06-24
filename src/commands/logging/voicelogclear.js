const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicelogclear')
    .setDescription('Clear all voice logs for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 60,
  aliases: ['vclogclear'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();

    if (isSlash) {
      await interaction.deferReply();
    } else {
      await interaction.channel.sendTyping();
    }

    try {
      const db = getDB();
      const count = await db('voice_logs')
        .where({ guild_id: interaction.guildId })
        .del();

      const data = { embeds: [successEmbed('Logs Cleared', `Deleted ${count} voice logs.`)] };
      return isSlash ? interaction.editReply(data) : interaction.reply(data);
    } catch (err) {
      const data = { embeds: [errorEmbed('Error', 'Failed to clear voice logs.')] };
      return isSlash ? interaction.editReply(data) : interaction.reply(data);
    }
  }
};
