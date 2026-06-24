const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spamwarn')
    .setDescription('Set spam action to warn with configurable warn count')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('warns').setDescription('Number of warns before mute (1-10)').setRequired(false)
        .setMinValue(1).setMaxValue(10)
    ),
  cooldown: 3,
  aliases: ['setspamwarn', 'spamwarning'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const warns = parseInt(args?.[0] || interaction.options?.getInteger('warns')) || 3;

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'spamfilter' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : { limit: 5, time: 5, action: 'warn', logChannel: null, ignoredRoles: [], ignoredChannels: [] };

      config.action = 'warn';
      config.warnsBeforeMute = warns;

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
        .setTitle('Spam Warn Configured')
        .setDescription(`Spam action set to **warn**.\nUser will be muted after **${warns}** warns.`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to configure spam warn.')] });
    }
  }
};
