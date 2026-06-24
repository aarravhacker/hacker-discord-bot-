const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcomeconfig')
    .setDescription('View the current welcome configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['welcomecfg'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const db = getDB();
      const existing = await db('welcome').where({ guild_id: interaction.guildId }).first();

      if (!existing) {
        return interaction.reply({ embeds: [infoEmbed('No Config', 'No welcome configuration found.')] });
      }

      const wc = JSON.parse(existing.config || '{}');
      const lines = [
        `**Enabled:** ${existing.enabled ? 'Yes' : 'No'}`,
        `**Channel:** ${existing.channel_id ? `<#${existing.channel_id}>` : 'Not set'}`,
        `**Embed:** ${wc.embed ? 'Yes' : 'No'}`,
        `**Color:** ${wc.color || 'Default'}`,
        `**Title:** ${wc.title || 'None'}`,
        `**Message:** ${wc.message ? wc.message.substring(0, 100) : 'None'}`,
        `**Footer:** ${wc.footer || 'None'}`,
        `**Author:** ${wc.author || 'None'}`,
        `**Image:** ${wc.image ? 'Set' : 'None'}`,
        `**Ping:** ${wc.ping ? 'Yes' : 'No'}`,
        `**Fields:** ${wc.fields ? wc.fields.length : 0}`
      ];

      await interaction.reply({ embeds: [infoEmbed('Welcome Configuration', lines.join('\n'))] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to fetch welcome config.')] });
    }
  }
};
