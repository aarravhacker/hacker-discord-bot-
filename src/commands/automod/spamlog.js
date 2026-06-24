const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spamlog')
    .setDescription('Set the log channel for spam filter actions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('The log channel').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['spamlogchannel', 'setspamlog'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
      if (!channel) return interaction.reply({ embeds: [errorEmbed('Please provide a valid channel.')] });

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'spamfilter' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : { limit: 5, time: 5, action: 'warn', logChannel: null, ignoredRoles: [], ignoredChannels: [] };

      config.logChannel = channel.id;

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
        .setTitle('Spam Log Channel')
        .setDescription(`Spam log channel set to ${channel}.`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to set spam log channel.')] });
    }
  }
};
