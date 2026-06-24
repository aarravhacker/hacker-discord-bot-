const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispamlog')
    .setDescription('Set the log channel for anti-spam actions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('The log channel').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['antispamlogch', 'aslog'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
      if (!channel) return interaction.reply({ embeds: [errorEmbed('Please provide a valid channel.')] });

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'antispam' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : {
          messageThreshold: 5, timeWindow: 10, duplicateThreshold: 3,
          linkThreshold: 3, mentionThreshold: 5, action: 'warn',
          logChannel: null, ignoredRoles: [], ignoredChannels: []
        };

      config.logChannel = channel.id;

      if (record) {
        await getDB()('automod')
          .where({ guild_id: interaction.guild.id, type: 'antispam' })
          .update({ config: JSON.stringify(config) });
      } else {
        await getDB()('automod').insert({
          guild_id: interaction.guild.id,
          type: 'antispam',
          config: JSON.stringify(config),
          enabled: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Anti-Spam Log Channel')
        .setDescription(`Anti-spam log channel set to ${channel}.`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to set anti-spam log channel.')] });
    }
  }
};
