const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcomefields')
    .setDescription('Add a field to the welcome embed')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Field name').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('value').setDescription('Field value').setRequired(true)
    )
    .addBooleanOption(opt =>
      opt.setName('inline').setDescription('Inline field (default: false)').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['welcomefield'],
  prefix: true,
  async execute(interaction, args) {
    const name = interaction.options?.getString('name') || (args && args[0]);
    const value = interaction.options?.getString('value') || (args && args[1]);
    const inline = interaction.options?.getBoolean('inline') || false;

    if (!name || !value) {
      return interaction.reply({ embeds: [errorEmbed('Missing Fields', 'Please provide a field name and value.')] });
    }

    try {
      const db = getDB();
      const existing = await db('welcome').where({ guild_id: interaction.guildId }).first();
      const config = existing ? JSON.parse(existing.config || '{}') : {};
      if (!config.fields) config.fields = [];
      config.fields.push({ name, value, inline });

      if (existing) {
        await db('welcome').where({ guild_id: interaction.guildId }).update({ config: JSON.stringify(config) });
      } else {
        await db('welcome').insert({ guild_id: interaction.guildId, enabled: true, config: JSON.stringify(config) });
      }

      await interaction.reply({ embeds: [successEmbed('Field Added', `Added field **${name}** with ${config.fields.length} total fields.`)] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to add field.')] });
    }
  }
};
