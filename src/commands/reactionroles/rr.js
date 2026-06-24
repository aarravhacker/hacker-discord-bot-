const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rr')
    .setDescription('Short alias for reactionrole - manage reaction roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('list').setDescription('List reaction roles'))
    .addSubcommand(sub => sub.setName('info').setDescription('Get info on a reaction role').addIntegerOption(opt => opt.setName('id').setDescription('Reaction role ID').setRequired(true))),
  cooldown: 5,
  aliases: ['reactionrole'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const sub = isSlash ? interaction.options?.getSubcommand() : args?.[0];
            const db = getDB();

            if (sub === 'list') {
              const rows = await db('reaction_roles').where({ guild_id: interaction.guild.id });
              if (!rows.length) return interaction.reply({ embeds: [infoEmbed('No Reaction Roles', 'None configured.')] });
              const list = rows.map(r => `\`#${r.id}\` | <#${r.channel_id}> | Message: ${r.message_id}`).join('\n');
              return interaction.reply({ embeds: [infoEmbed('Reaction Roles', list)] });
            }

            if (sub === 'info') {
              const id = isSlash ? interaction.options?.getInteger('id') : (args?.[1] ? parseInt(args[1]) : null);
              const rr = await db('reaction_roles').where({ id, guild_id: interaction.guild.id }).first();
              if (!rr) return interaction.reply({ embeds: [infoEmbed('Not Found', 'Reaction role not found.')] });
              const roles = Array.isArray(rr.roles) ? rr.roles.map(r => `${r.emoji} → <@&${r.roleId}>`).join('\n') : 'None';
              return interaction.reply({ embeds: [infoEmbed(`Reaction Role #${rr.id}`, `Channel: <#${rr.channel_id}>\nMessage: ${rr.message_id}\n\n**Roles:**\n${roles}`)] });
            }
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
