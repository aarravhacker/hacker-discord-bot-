const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wordfilter')
    .setDescription('Toggle the word filter system on or off')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['wf', 'togglewordfilter'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const guild = await getGuild(interaction.guild.id);
      const current = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
        .first();

      const enabled = current ? !current.enabled : true;

      if (current) {
        await getDB()('automod')
          .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
          .update({ enabled });
      } else {
        await getDB()('automod').insert({
          guild_id: interaction.guild.id,
          type: 'wordfilter',
          config: JSON.stringify({ words: [], action: 'delete', logChannel: null, ignoredRoles: [], ignoredChannels: [] }),
          enabled: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Word Filter')
        .setDescription(`Word filter has been **${enabled ? 'enabled' : 'disabled'}**.`)
        .setColor(enabled ? embedColors.success : embedColors.warning)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to toggle word filter.')] });
    }
  }
};
