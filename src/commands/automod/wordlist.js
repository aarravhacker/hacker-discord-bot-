const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { errorEmbed, infoEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wordlist')
    .setDescription('Display all filtered words')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['filteredwords', 'badwords'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
        .first();

      if (!record) return interaction.reply({ embeds: [infoEmbed('No word filter configured.')] });

      const config = JSON.parse(record.config);
      if (!config.words || config.words.length === 0) {
        return interaction.reply({ embeds: [infoEmbed('The filter word list is empty.')] });
      }

      const list = config.words.map((w, i) => `\`${i + 1}\`. ${w}`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle('Filtered Words')
        .setDescription(list.length > 2048 ? list.substring(0, 2040) + '...' : list)
        .setColor(embedColors.info)
        .setFooter({ text: `Total: ${config.words.length} word(s)` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to fetch word list.')] });
    }
  }
};
