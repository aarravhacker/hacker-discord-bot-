const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolemembers')
    .setDescription('List members with a specific role')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
    .addIntegerOption(opt => opt.setName('page').setDescription('Page number').setMinValue(1)),
  cooldown: 5,
  aliases: ['rmembers', 'listrole'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const role = interaction.options?.getRole('role') || interaction.guild.roles.cache.get(args?.[0]?.replace(/[<@&>]/g, ''));
            if (!role) return interaction.reply({ embeds: [errorEmbed('Please provide a valid role.')] });

            const page = interaction.options?.getInteger('page') || parseInt(args?.[1]) || 1;
            const perPage = 20;

            const members = interaction.guild.members.cache.filter(m => m.roles.cache.has(role.id));
            const totalPages = Math.ceil(members.size / perPage) || 1;

            if (page > totalPages) return interaction.reply({ embeds: [errorEmbed(`Page ${page} doesn't exist. Max: ${totalPages}`)] });

            const paged = members.array().slice((page - 1) * perPage, page * perPage);
            const list = paged.map(m => `${m.user.tag} (${m.id})`).join('\n');

            return interaction.reply({
              embeds: [infoEmbed(`**${role.name}** members (${members.size} total, page ${page}/${totalPages}):\n${list || 'No members with this role.'}`)]
            });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};