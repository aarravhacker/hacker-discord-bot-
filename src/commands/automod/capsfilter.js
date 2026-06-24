const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('capsfilter')
    .setDescription('Toggle excessive caps filter')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(opt =>
      opt.setName('enabled').setDescription('Enable or disable caps filter').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['togglecaps', 'caps'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const enabled = args?.[0] === 'true' || args?.[0] === 'on' || interaction.options?.getBoolean('enabled');

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'capsfilter' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : { limit: 70, minChars: 5, action: 'delete', logChannel: null, ignoredRoles: [], ignoredChannels: [] };

      if (record) {
        await getDB()('automod')
          .where({ guild_id: interaction.guild.id, type: 'capsfilter' })
          .update({ enabled });
      } else {
        await getDB()('automod').insert({
          guild_id: interaction.guild.id,
          type: 'capsfilter',
          config: JSON.stringify(config),
          enabled: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Caps Filter')
        .setDescription(`Caps filter has been **${enabled ? 'enabled' : 'disabled'}**.`)
        .setColor(enabled ? embedColors.success : embedColors.warning)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to toggle caps filter.')] });
    }
  }
};
