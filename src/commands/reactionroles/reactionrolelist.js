const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrolelist')
    .setDescription('List all reaction roles in this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['rrlist'],
  prefix: true,
  async execute(interaction) {
      try {
            const db = getDB();
            const rows = await db('reaction_roles').where({ guild_id: interaction.guild.id });
            if (!rows.length) return interaction.reply({ embeds: [infoEmbed('No Reaction Roles', 'This server has no reaction roles configured.')] });

            const list = rows.map(r => {
              const roleCount = Array.isArray(r.roles) ? r.roles.length : 0;
              return `\`#${r.id}\` | <#${r.channel_id}> | Message: \`${r.message_id}\` | ${roleCount} role(s)`;
            }).join('\n');

            return interaction.reply({ embeds: [infoEmbed('Reaction Roles', list)] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
