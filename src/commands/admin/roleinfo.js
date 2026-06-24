const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../../utils/helpers');
const { formatNumber } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Get information about a role')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt => opt.setName('role').setDescription('Role to inspect').setRequired(true)),
  cooldown: 3,
  aliases: ['ri', 'rinfo'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
      try {
            const role = interaction.options?.getRole('role') || interaction.guild.roles.cache.get(args?.[0]?.replace(/[<@&>]/g, ''));
            if (!role) return interaction.reply({ embeds: [errorEmbed('Please provide a valid role.')] });

            const perms = role.permissions.toArray();
            const permCount = perms.length;
            const permSample = perms.slice(0, 10).map(p => `\`${p}\``).join(', ');
            const memberCount = interaction.guild.members.cache.filter(m => m.roles.cache.has(role.id)).size;

            const embed = infoEmbed(`**Role Info: ${role.name}**`)
              .addFields(
                { name: 'ID', value: role.id, inline: true },
                { name: 'Color', value: role.hexColor, inline: true },
                { name: 'Members', value: formatNumber(memberCount), inline: true },
                { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
                { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
                { name: 'Managed', value: role.managed ? 'Yes' : 'No', inline: true },
                { name: 'Position', value: `${role.position}`, inline: true },
                { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Permissions', value: `${permCount} permissions\n${permSample}${permCount > 10 ? '...' : ''}`, inline: false }
              )
              .setColor(role.hexColor);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};