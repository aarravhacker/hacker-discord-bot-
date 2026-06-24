const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spammute')
    .setDescription('Configure mute duration for spam violations')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('duration').setDescription('Mute duration in minutes (1-1440)').setRequired(true)
        .setMinValue(1).setMaxValue(1440)
    ),
  cooldown: 3,
  aliases: ['setspammute', 'spammutetime'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const duration = parseInt(args?.[0] || interaction.options?.getInteger('duration'));
      if (isNaN(duration) || duration < 1 || duration > 1440) {
        return interaction.reply({ embeds: [errorEmbed('Duration must be between 1 and 1440 minutes.')] });
      }

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'spamfilter' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : { limit: 5, time: 5, action: 'mute', logChannel: null, ignoredRoles: [], ignoredChannels: [] };

      config.action = 'mute';
      config.muteDuration = duration;

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
        .setTitle('Spam Mute Configured')
        .setDescription(`Spam action set to **mute** for **${duration}** minutes.`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to configure spam mute.')] });
    }
  }
};
