const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('goodbyeping')
    .setDescription('Toggle pinging users in goodbye messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['goodbyepingtoggle'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const db = getDB();
      const existing = await db('goodbye').where({ guild_id: interaction.guildId }).first();
      const config = existing ? JSON.parse(existing.config || '{}') : {};
      config.ping = !config.ping;

      if (existing) {
        await db('goodbye').where({ guild_id: interaction.guildId }).update({ config: JSON.stringify(config) });
      } else {
        await db('goodbye').insert({ guild_id: interaction.guildId, enabled: true, config: JSON.stringify(config) });
      }

      const embed = config.ping
        ? successEmbed('Ping Enabled', 'Users will now be **pinged** in goodbye messages.')
        : successEmbed('Ping Disabled', 'Users will no longer be pinged in goodbye messages.');
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to toggle ping.')] });
    }
  }
};
