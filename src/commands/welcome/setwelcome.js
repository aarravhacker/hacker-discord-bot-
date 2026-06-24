const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Toggle welcome messages on or off')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['welcomeenable', 'togglewelcome'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const db = getDB();
      const existing = await db('welcome').where({ guild_id: interaction.guildId }).first();

      if (existing) {
        await db('welcome').where({ guild_id: interaction.guildId }).update({ enabled: !existing.enabled });
        const embed = existing.enabled
          ? successEmbed('Welcome Disabled', 'Welcome messages are now **disabled**.')
          : successEmbed('Welcome Enabled', 'Welcome messages are now **enabled**.');
        await interaction.reply({ embeds: [embed] });
      } else {
        await db('welcome').insert({ guild_id: interaction.guildId, enabled: true, config: '{}' });
        await interaction.reply({ embeds: [successEmbed('Welcome Enabled', 'Welcome messages are now **enabled**.')] });
      }
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to toggle welcome messages.')] });
    }
  }
};
