const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spamtime')
    .setDescription('Set the time window for spam detection (seconds)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('seconds').setDescription('Time window in seconds (1-60)').setRequired(true)
        .setMinValue(1).setMaxValue(60)
    ),
  cooldown: 3,
  aliases: ['setspamtime', 'spamwindow'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const seconds = parseInt(args?.[0] || interaction.options?.getInteger('seconds'));
      if (isNaN(seconds) || seconds < 1 || seconds > 60) {
        return interaction.reply({ embeds: [errorEmbed('Please provide a time between 1 and 60 seconds.')] });
      }

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'spamfilter' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : { limit: 5, time: 5, action: 'warn', logChannel: null, ignoredRoles: [], ignoredChannels: [] };

      config.time = seconds;

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
        .setTitle('Spam Time Window Updated')
        .setDescription(`Spam time window set to **${seconds}** seconds.`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to set spam time window.')] });
    }
  }
};
