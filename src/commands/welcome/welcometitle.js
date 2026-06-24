const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcometitle')
    .setDescription('Set the welcome embed title')
    .addStringOption(opt =>
      opt.setName('title').setDescription('Embed title (leave empty to remove)').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['welcomet'],
  prefix: true,
  async execute(interaction, args) {
    const title = interaction.options?.getString('title') || (args && args.join(' ')) || null;

    try {
      const db = getDB();
      const existing = await db('welcome').where({ guild_id: interaction.guildId }).first();
      const config = existing ? JSON.parse(existing.config || '{}') : {};
      config.title = title;

      if (existing) {
        await db('welcome').where({ guild_id: interaction.guildId }).update({ config: JSON.stringify(config) });
      } else {
        await db('welcome').insert({ guild_id: interaction.guildId, enabled: true, config: JSON.stringify(config) });
      }

      const embed = title
        ? successEmbed('Title Set', `Welcome title set to: **${title}**`)
        : successEmbed('Title Removed', 'Welcome title has been removed.');
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to set welcome title.')] });
    }
  }
};
