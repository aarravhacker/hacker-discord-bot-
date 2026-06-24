const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrolerestore')
    .setDescription('Restore reaction roles from a JSON backup')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName('json').setDescription('JSON backup string').setRequired(true)),
  cooldown: 15,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const db = getDB();
    const json = isSlash ? interaction.options?.getString('json') : args?.[0];
    let backup;
    try {
      backup = JSON.parse(json);
    } catch (e) {
      return interaction.reply({ embeds: [errorEmbed('Invalid JSON', 'Could not parse the JSON backup.')] });
    }

    if (!Array.isArray(backup)) return interaction.reply({ embeds: [errorEmbed('Invalid Format', 'JSON must be an array.')] });

    let restored = 0;
    for (const item of backup) {
      try {
        await db('reaction_roles').insert({
          guild_id: interaction.guild.id,
          channel_id: item.channel_id,
          message_id: item.message_id,
          roles: JSON.stringify(item.roles || [])
        });
        restored++;
      } catch (e) {}
    }

    return interaction.reply({ embeds: [successEmbed('Restored', `Restored **${restored}** of **${backup.length}** reaction roles.`)] });
  }
};
