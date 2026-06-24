const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('goodbyecolor')
    .setDescription('Set the goodbye embed color')
    .addStringOption(opt =>
      opt.setName('hex').setDescription('Hex color (e.g. #FF0000)').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['goodbyecolour'],
  prefix: true,
  async execute(interaction, args) {
    const hex = interaction.options?.getString('hex') || (args && args[0]);
    if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      return interaction.reply({ embeds: [errorEmbed('Invalid Color', 'Please provide a valid hex color (e.g. #FF0000).')] });
    }

    try {
      const db = getDB();
      const existing = await db('goodbye').where({ guild_id: interaction.guildId }).first();
      const config = existing ? JSON.parse(existing.config || '{}') : {};
      config.color = hex;

      if (existing) {
        await db('goodbye').where({ guild_id: interaction.guildId }).update({ config: JSON.stringify(config) });
      } else {
        await db('goodbye').insert({ guild_id: interaction.guildId, enabled: true, config: JSON.stringify(config) });
      }

      await interaction.reply({ embeds: [successEmbed('Color Set', `Goodbye embed color set to \`${hex}\`.`)] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to set goodbye color.')] });
    }
  }
};
