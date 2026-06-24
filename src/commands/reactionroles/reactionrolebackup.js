const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, infoEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrolebackup')
    .setDescription('Export all reaction roles as JSON')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 10,
  aliases: [],
  prefix: true,
  async execute(interaction) {
      try {
            const db = getDB();
            const rows = await db('reaction_roles').where({ guild_id: interaction.guild.id });
            if (!rows.length) return interaction.reply({ embeds: [infoEmbed('Empty', 'No reaction roles to back up.')] });

            const backup = rows.map(r => ({
              id: r.id,
              channel_id: r.channel_id,
              message_id: r.message_id,
              roles: r.roles
            }));

            const json = JSON.stringify(backup, null, 2);
            if (json.length > 1900) {
              return interaction.reply({ content: `\`\`\`json\n${json.substring(0, 1900)}\n\`\`\`\n*(truncated)*` });
            }

            return interaction.reply({ content: `\`\`\`json\n${json}\n\`\`\`` });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
