const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcomefooter')
    .setDescription('Set the welcome embed footer text')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Footer text (leave empty to remove)').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['welcomeft'],
  prefix: true,
  async execute(interaction, args) {
    const text = interaction.options?.getString('text') || (args && args.join(' ')) || null;

    try {
      const db = getDB();
      const existing = await db('welcome').where({ guild_id: interaction.guildId }).first();
      const config = existing ? JSON.parse(existing.config || '{}') : {};
      config.footer = text;

      if (existing) {
        await db('welcome').where({ guild_id: interaction.guildId }).update({ config: JSON.stringify(config) });
      } else {
        await db('welcome').insert({ guild_id: interaction.guildId, enabled: true, config: JSON.stringify(config) });
      }

      const embed = text
        ? successEmbed('Footer Set', `Welcome footer set to: **${text}**`)
        : successEmbed('Footer Removed', 'Welcome footer has been removed.');
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to set welcome footer.')] });
    }
  }
};
