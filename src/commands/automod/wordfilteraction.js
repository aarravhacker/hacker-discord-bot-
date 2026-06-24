const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wordfilteraction')
    .setDescription('Set the action for filtered words')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('action')
        .setDescription('Action to take')
        .setRequired(true)
        .addChoices(
          { name: 'Delete Message', value: 'delete' },
          { name: 'Warn User', value: 'warn' },
          { name: 'Mute User', value: 'mute' },
          { name: 'Kick User', value: 'kick' },
          { name: 'Ban User', value: 'ban' },
          { name: 'Timeout (60s)', value: 'timeout' }
        )
    ),
  cooldown: 3,
  aliases: ['wfaction', 'filteraction'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const action = args?.[0] || interaction.options?.getString('action');
      const validActions = ['delete', 'warn', 'mute', 'kick', 'ban', 'timeout'];
      if (!action || !validActions.includes(action)) {
        return interaction.reply({
          embeds: [errorEmbed(`Invalid action. Valid options: ${validActions.join(', ')}`)]
        });
      }

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : { words: [], action: 'delete', logChannel: null, ignoredRoles: [], ignoredChannels: [] };

      config.action = action;

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
        .setTitle('Word Filter Action Updated')
        .setDescription(`Filtered word action set to **${action}**.`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to set word filter action.')] });
    }
  }
};
