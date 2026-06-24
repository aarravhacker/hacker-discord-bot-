const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcomeauthor')
    .setDescription('Set the welcome embed author name')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Author name (leave empty to remove)').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['welcomeauth'],
  prefix: true,
  async execute(interaction, args) {
    const name = interaction.options?.getString('name') || (args && args.join(' ')) || null;

    try {
      const db = getDB();
      const existing = await db('welcome').where({ guild_id: interaction.guildId }).first();
      const config = existing ? JSON.parse(existing.config || '{}') : {};
      config.author = name;

      if (existing) {
        await db('welcome').where({ guild_id: interaction.guildId }).update({ config: JSON.stringify(config) });
      } else {
        await db('welcome').insert({ guild_id: interaction.guildId, enabled: true, config: JSON.stringify(config) });
      }

      const embed = name
        ? successEmbed('Author Set', `Welcome author set to: **${name}**`)
        : successEmbed('Author Removed', 'Welcome author has been removed.');
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to set welcome author.')] });
    }
  }
};
