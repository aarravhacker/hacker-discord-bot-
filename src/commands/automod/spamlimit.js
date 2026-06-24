const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spamlimit')
    .setDescription('Set the max messages before spam is triggered')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('limit').setDescription('Number of messages (2-20)').setRequired(true)
        .setMinValue(2).setMaxValue(20)
    ),
  cooldown: 3,
  aliases: ['setspamlimit', 'spamthreshold'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const limit = parseInt(args?.[0] || interaction.options?.getInteger('limit'));
      if (isNaN(limit) || limit < 2 || limit > 20) {
        return interaction.reply({ embeds: [errorEmbed('Please provide a limit between 2 and 20.')] });
      }

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'spamfilter' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : { limit: 5, time: 5, action: 'warn', logChannel: null, ignoredRoles: [], ignoredChannels: [] };

      config.limit = limit;

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
        .setTitle('Spam Limit Updated')
        .setDescription(`Spam limit set to **${limit}** messages.`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to set spam limit.')] });
    }
  }
};
