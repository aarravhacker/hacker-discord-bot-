const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcomeembed')
    .setDescription('Toggle embed mode for welcome messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['welcomeemb'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const db = getDB();
      const existing = await db('welcome').where({ guild_id: interaction.guildId }).first();
      const config = existing ? JSON.parse(existing.config || '{}') : {};
      config.embed = !config.embed;

      if (existing) {
        await db('welcome').where({ guild_id: interaction.guildId }).update({ config: JSON.stringify(config) });
      } else {
        await db('welcome').insert({ guild_id: interaction.guildId, enabled: true, config: JSON.stringify(config) });
      }

      const embed = config.embed
        ? successEmbed('Embed Enabled', 'Welcome messages will now use **embeds**.')
        : successEmbed('Embed Disabled', 'Welcome messages will now use **text**.');
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to toggle embed mode.')] });
    }
  }
};
