const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolepermissions')
    .setDescription('Manage role permissions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('add').setDescription('Add a permission to a role')
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
      .addStringOption(opt => opt.setName('permission').setDescription('Permission').setRequired(true)))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove a permission from a role')
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
      .addStringOption(opt => opt.setName('permission').setDescription('Permission').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List permissions for a role')
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand(sub => sub.setName('clear').setDescription('Clear all permissions from a role')
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))),
  cooldown: 3,
  aliases: ['roleperm', 'rperm'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    const sub = interaction.options?.getSubcommand() || args?.[0];

    const role = interaction.options?.getRole('role') || interaction.guild.roles.cache.get(args?.[1]?.replace(/[<@&>]/g, ''));
    if (!role) return interaction.reply({ embeds: [errorEmbed('Please provide a valid role.')] });

    if (sub === 'list') {
      const perms = role.permissions.toArray();
      const formatted = perms.map(p => `\`${p}\``).join(', ');
      return interaction.reply({ embeds: [infoEmbed(`**${role.name}** permissions:\n${formatted || 'None'}`)] });
    }

    if (sub === 'clear') {
      try {
        await role.setPermissions(0n, `Permissions cleared by ${user.tag}`);
        return interaction.reply({ embeds: [successEmbed(`Cleared all permissions for ${role}`)] });
      } catch (err) {
        return await interaction.reply({ embeds: [errorEmbed(`Failed: ${err.message}`)] });
      }
    }

    const permission = interaction.options?.getString('permission') || args?.[2];
    if (!permission) return interaction.reply({ embeds: [errorEmbed('Please provide a permission name.')] });

    const permFlag = PermissionFlagsBits[permission];
    if (!permFlag) return interaction.reply({ embeds: [errorEmbed(`Invalid permission: \`${permission}\`. Use \`/help permissions\` for a list.`)] });

    try {
      const current = role.permissions;
      const updated = sub === 'add' ? current.add(permFlag) : current.remove(permFlag);
      await role.setPermissions(updated, `Permission ${sub === 'add' ? 'added' : 'removed'} by ${user.tag}`);
      return interaction.reply({
        embeds: [successEmbed(`${sub === 'add' ? 'Added' : 'Removed'} \`${permission}\` ${sub === 'add' ? 'to' : 'from'} ${role}`)]
      });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed(`Failed: ${err.message}`)] });
    }
  }
};
