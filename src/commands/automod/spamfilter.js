const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spamfilter')
    .setDescription('Toggle the spam filter system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['togglespam', 'spamtoggle'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'spamfilter' })
        .first();

      const enabled = record ? !record.enabled : true;

      if (record) {
        await getDB()('automod')
          .where({ guild_id: interaction.guild.id, type: 'spamfilter' })
          .update({ enabled });
      } else {
        await getDB()('automod').insert({
          guild_id: interaction.guild.id,
          type: 'spamfilter',
          config: JSON.stringify({ limit: 5, time: 5, action: 'warn', logChannel: null, ignoredRoles: [], ignoredChannels: [] }),
          enabled: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Spam Filter')
        .setDescription(`Spam filter has been **${enabled ? 'enabled' : 'disabled'}**.`)
        .setColor(enabled ? embedColors.success : embedColors.warning)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to toggle spam filter.')] });
    }
  }
};
