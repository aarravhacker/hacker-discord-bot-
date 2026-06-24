const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Manage reaction roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('create').setDescription('Create a new reaction role'))
    .addSubcommand(sub => sub.setName('list').setDescription('List all reaction roles'))
    .addSubcommand(sub => sub.setName('delete').setDescription('Delete a reaction role').addIntegerOption(opt => opt.setName('id').setDescription('Reaction role ID').setRequired(true))),
  cooldown: 5,
  aliases: ['rr'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const user = isSlash ? interaction.user : interaction.author;
            const db = getDB();
            const sub = isSlash ? interaction.options?.getSubcommand() : args?.[0];

            if (sub === 'create') {
              const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId('rr_create_mode')
                  .setPlaceholder('Select creation mode')
                  .addOptions([
                    { label: 'Emoji + Role', value: 'emoji_role', description: 'Add emoji-role pairs manually' },
                    { label: 'Auto Roles', value: 'auto', description: 'Auto-assign roles on message' }
                  ])
              );
              return interaction.reply({ content: '**Reaction Role Creator**\nSelect how you want to create the reaction role:', components: [row] });
            }

            if (sub === 'list') {
              const rows = await db('reaction_roles').where({ guild_id: interaction.guild.id });
              if (!rows.length) return interaction.reply({ embeds: [infoEmbed('No reaction roles', 'This server has no reaction roles configured.')] });
              const list = rows.map(r => `\`#${r.id}\` | <#${r.channel_id}> | Message: ${r.message_id} | Roles: ${Array.isArray(r.roles) ? r.roles.length : 0} role(s)`).join('\n');
              return interaction.reply({ embeds: [infoEmbed('Reaction Roles', list)] });
            }

            if (sub === 'delete') {
              const id = isSlash ? interaction.options?.getInteger('id') : (args?.[1] ? parseInt(args[1]) : null);
              const deleted = await db('reaction_roles').where({ id, guild_id: interaction.guild.id }).del();
              if (!deleted) return interaction.reply({ embeds: [errorEmbed('Not Found', 'Reaction role not found.')] });
              return interaction.reply({ embeds: [successEmbed('Deleted', `Reaction role #${id} has been deleted.`)] });
            }
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};