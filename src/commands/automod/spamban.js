const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spamban')
    .setDescription('Set spam action to ban')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 3,
  aliases: ['setspamban', 'spban'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'spamfilter' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : { limit: 5, time: 5, action: 'warn', logChannel: null, ignoredRoles: [], ignoredChannels: [] };

      config.action = 'ban';

      if (record) {
        await getDB()('automod')
          .where({ guild_id: interaction.guild.id, type: 'spamfilter' })
          .update({ config: JSON.stringify(config) });
      } else {
        await getDB()('automod').insert({
          guild_id: interaction.guild.id,
          type: 'spamfilter',
          config: JSON.stringify(config),
          enabled: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Spam Action Updated')
        .setDescription('Spam action set to **ban**.')
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to set spam ban.')] });
    }
  }
};
