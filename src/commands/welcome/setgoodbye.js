const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setgoodbye')
    .setDescription('Toggle goodbye messages on or off')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['goodbyeenable', 'togglegoodbye'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const db = getDB();
      const existing = await db('goodbye').where({ guild_id: interaction.guildId }).first();

      if (existing) {
        await db('goodbye').where({ guild_id: interaction.guildId }).update({ enabled: !existing.enabled });
        const embed = existing.enabled
          ? successEmbed('Goodbye Disabled', 'Goodbye messages are now **disabled**.')
          : successEmbed('Goodbye Enabled', 'Goodbye messages are now **enabled**.');
        await interaction.reply({ embeds: [embed] });
      } else {
        await db('goodbye').insert({ guild_id: interaction.guildId, enabled: true, config: '{}' });
        await interaction.reply({ embeds: [successEmbed('Goodbye Enabled', 'Goodbye messages are now **enabled**.')] });
      }
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to toggle goodbye messages.')] });
    }
  }
};
