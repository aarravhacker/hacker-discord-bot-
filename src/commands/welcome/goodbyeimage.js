const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('goodbyeimage')
    .setDescription('Set the goodbye image URL')
    .addStringOption(opt =>
      opt.setName('url').setDescription('Image URL (leave empty to remove)').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['goodbyeimg'],
  prefix: true,
  async execute(interaction, args) {
    const url = interaction.options?.getString('url') || (args && args[0]) || null;

    try {
      const db = getDB();
      const existing = await db('goodbye').where({ guild_id: interaction.guildId }).first();
      const config = existing ? JSON.parse(existing.config || '{}') : {};
      config.image = url;

      if (existing) {
        await db('goodbye').where({ guild_id: interaction.guildId }).update({ config: JSON.stringify(config) });
      } else {
        await db('goodbye').insert({ guild_id: interaction.guildId, enabled: true, config: JSON.stringify(config) });
      }

      const embed = url
        ? successEmbed('Image Set', 'Goodbye image has been set.')
        : successEmbed('Image Removed', 'Goodbye image has been removed.');
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to set goodbye image.')] });
    }
  }
};
