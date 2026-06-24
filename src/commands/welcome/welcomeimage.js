const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcomeimage')
    .setDescription('Set the welcome image URL')
    .addStringOption(opt =>
      opt.setName('url').setDescription('Image URL (leave empty to remove)').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['welcomeimg'],
  prefix: true,
  async execute(interaction, args) {
    const url = interaction.options?.getString('url') || (args && args[0]) || null;

    try {
      const db = getDB();
      const existing = await db('welcome').where({ guild_id: interaction.guildId }).first();
      const config = existing ? JSON.parse(existing.config || '{}') : {};
      config.image = url;

      if (existing) {
        await db('welcome').where({ guild_id: interaction.guildId }).update({ config: JSON.stringify(config) });
      } else {
        await db('welcome').insert({ guild_id: interaction.guildId, enabled: true, config: JSON.stringify(config) });
      }

      const embed = url
        ? successEmbed('Image Set', 'Welcome image has been set.')
        : successEmbed('Image Removed', 'Welcome image has been removed.');
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to set welcome image.')] });
    }
  }
};
