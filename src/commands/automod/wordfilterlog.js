const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wordfilterlog')
    .setDescription('Set the log channel for word filter actions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('The log channel').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['wflog', 'filterlog'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
      if (!channel) return interaction.reply({ embeds: [errorEmbed('Please provide a valid channel.')] });

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : { words: [], action: 'delete', logChannel: null, ignoredRoles: [], ignoredChannels: [] };

      config.logChannel = channel.id;

      if (record) {
        await getDB()('automod')
          .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
          .update({ config: JSON.stringify(config) });
      } else {
        await getDB()('automod').insert({
          guild_id: interaction.guild.id,
          type: 'wordfilter',
          config: JSON.stringify(config),
          enabled: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Word Filter Log Channel')
        .setDescription(`Log channel set to ${channel}.`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to set log channel.')] });
    }
  }
};
