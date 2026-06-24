const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { errorEmbed, infoEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('badwordlist')
    .setDescription('List all bad words with their custom responses')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['listbadwords', 'badwordslist'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
        .first();

      if (!record) return interaction.reply({ embeds: [infoEmbed('No word filter configured.')] });

      const config = JSON.parse(record.config);
      const customResponses = config.customResponses || {};

      if (Object.keys(customResponses).length === 0) {
        return interaction.reply({ embeds: [infoEmbed('No custom bad word responses configured.')] });
      }

      const entries = Object.entries(customResponses)
        .map(([word, resp], i) => `\`${i + 1}\`. **${word}** → ${resp}`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setTitle('Bad Word List')
        .setDescription(entries.length > 2048 ? entries.substring(0, 2040) + '...' : entries)
        .setColor(embedColors.info)
        .setFooter({ text: `Total: ${Object.keys(customResponses).length} bad word(s)` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to fetch bad word list.')] });
    }
  }
};
