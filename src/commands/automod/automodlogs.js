const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automodlogs')
    .setDescription('Set the global auto-moderation log channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('The log channel').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['amlogs', 'setamlogs'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const channel = interaction.options?.getChannel('channel') || interaction.guild.channels.cache.get(args?.[0]);
      if (!channel) return interaction.reply({ embeds: [errorEmbed('Please provide a valid channel.')] });

      const records = await getDB()('automod')
        .where({ guild_id: interaction.guild.id });

      for (const record of records) {
        const config = JSON.parse(record.config);
        config.logChannel = channel.id;
        await getDB()('automod')
          .where({ id: record.id })
          .update({ config: JSON.stringify(config) });
      }

      const embed = new EmbedBuilder()
        .setTitle('Auto-Mod Global Log Channel')
        .setDescription(`Updated log channel for ${records.length} module(s) to ${channel}.`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to set auto-mod log channel.')] });
    }
  }
};
