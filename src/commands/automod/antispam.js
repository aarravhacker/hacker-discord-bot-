const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispam')
    .setDescription('Toggle the advanced anti-spam system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['toggleantispam', 'antispamtog'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'antispam' })
        .first();

      const enabled = record ? !record.enabled : true;

      if (record) {
        await getDB()('automod')
          .where({ guild_id: interaction.guild.id, type: 'antispam' })
          .update({ enabled });
      } else {
        await getDB()('automod').insert({
          guild_id: interaction.guild.id,
          type: 'antispam',
          config: JSON.stringify({
            messageThreshold: 5,
            timeWindow: 10,
            duplicateThreshold: 3,
            linkThreshold: 3,
            mentionThreshold: 5,
            action: 'warn',
            logChannel: null,
            ignoredRoles: [],
            ignoredChannels: []
          }),
          enabled: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Anti-Spam System')
        .setDescription(`Anti-spam has been **${enabled ? 'enabled' : 'disabled'}**.`)
        .setColor(enabled ? embedColors.success : embedColors.warning)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to toggle anti-spam.')] });
    }
  }
};
