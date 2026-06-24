const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('goodbyeconfig')
    .setDescription('View the current goodbye configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['goodbyecfg'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const db = getDB();
      const existing = await db('goodbye').where({ guild_id: interaction.guildId }).first();

      if (!existing) {
        return interaction.reply({ embeds: [infoEmbed('No Config', 'No goodbye configuration found.')] });
      }

      const gc = JSON.parse(existing.config || '{}');
      const lines = [
        `**Enabled:** ${existing.enabled ? 'Yes' : 'No'}`,
        `**Channel:** ${existing.channel_id ? `<#${existing.channel_id}>` : 'Not set'}`,
        `**Embed:** ${gc.embed ? 'Yes' : 'No'}`,
        `**Color:** ${gc.color || 'Default'}`,
        `**Title:** ${gc.title || 'None'}`,
        `**Message:** ${gc.message ? gc.message.substring(0, 100) : 'None'}`,
        `**Image:** ${gc.image ? 'Set' : 'None'}`,
        `**Ping:** ${gc.ping ? 'Yes' : 'No'}`
      ];

      await interaction.reply({ embeds: [infoEmbed('Goodbye Configuration', lines.join('\n'))] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to fetch goodbye config.')] });
    }
  }
};
