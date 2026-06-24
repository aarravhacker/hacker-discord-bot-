const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed, createEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('messagelogsearch')
    .setDescription('Search message logs')
    .addStringOption(opt =>
      opt.setName('query').setDescription('Search query').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('count').setDescription('Max results (1-25)').setMinValue(1).setMaxValue(25).setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 10,
  aliases: ['msglogsearch'],
  prefix: true,
  async execute(interaction, args) {
    const query = interaction.options?.getString('query') || (args && args.join(' '));
    const count = interaction.options?.getInteger('count') || 10;

    if (!query) {
      return interaction.reply({ embeds: [errorEmbed('No Query', 'Please provide a search query.')] });
    }

    try {
      const db = getDB();
      const logs = await db('message_logs')
        .where({ guild_id: interaction.guildId })
        .whereRaw('content ILIKE ?', [`%${query}%`])
        .orderBy('created_at', 'desc')
        .limit(count);

      if (!logs.length) {
        return interaction.reply({ embeds: [infoEmbed('No Results', `No message logs matching "${query}" found.`)] });
      }

      const fields = logs.map(log => ({
        name: `${log.user_tag || 'Unknown'} in #${log.channel_id}`,
        value: log.content ? log.content.substring(0, 150) : 'No content',
        inline: false
      }));

      const embed = createEmbed(`Search Results: "${query}"`, '', config.embedColors.info)
        .addFields(fields);

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to search message logs.')] });
    }
  }
};
