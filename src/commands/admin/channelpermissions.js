const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channelpermissions')
    .setDescription('Manage channel permissions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('set').setDescription('Set a permission override')
      .addChannelOption(opt => opt.setName('channel').setDescription('Channel').setRequired(true))
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
      .addStringOption(opt => opt.setName('permission').setDescription('Permission to set').setRequired(true))
      .addBooleanOption(opt => opt.setName('allow').setDescription('Allow or deny').setRequired(true)))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove a permission override')
      .addChannelOption(opt => opt.setName('channel').setDescription('Channel').setRequired(true))
      .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List permissions for a channel')
      .addChannelOption(opt => opt.setName('channel').setDescription('Channel').setRequired(true))),
  cooldown: 3,
  aliases: ['chperm', 'chpermissions'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const sub = interaction.options?.getSubcommand() || args?.[0];

    if (sub === 'set') {
      const channel = interaction.options?.getChannel('channel');
      const role = interaction.options?.getRole('role');
      const permission = interaction.options?.getString('permission');
      const allow = interaction.options?.getBoolean('allow');

      if (!channel || !role || !permission) {
        return interaction.reply({ embeds: [errorEmbed('Missing required options.')] });
      }

      try {
        await channel.permissionOverwrites.edit(role.id, { [permission]: allow });
        return interaction.reply({
          embeds: [successEmbed(`Set **${permission}** to ${allow ? 'ALLOW' : 'DENY'} for ${role} in ${channel}`)]
        });
      } catch (err) {
        return await interaction.reply({ embeds: [errorEmbed(`Failed: ${err.message}`)] });
      }
    }

    if (sub === 'remove') {
      const channel = interaction.options?.getChannel('channel');
      const role = interaction.options?.getRole('role');
      if (!channel || !role) return interaction.reply({ embeds: [errorEmbed('Missing required options.')] });

      try {
        await channel.permissionOverwrites.delete(role.id);
        return interaction.reply({ embeds: [successEmbed(`Removed permission overrides for ${role} in ${channel}`)] });
      } catch (err) {
        return await interaction.reply({ embeds: [errorEmbed(`Failed: ${err.message}`)] });
      }
    }

    if (sub === 'list') {
      const channel = interaction.options?.getChannel('channel');
      if (!channel) return interaction.reply({ embeds: [errorEmbed('Please provide a valid channel.')] });

      const overwrites = channel.permissionOverwrites.cache;
      if (!overwrites.size) return interaction.reply({ embeds: [infoEmbed('No permission overrides for this channel.')] });

      const list = overwrites.map(o => {
        const target = interaction.guild.roles.cache.get(o.id) || interaction.guild.members.cache.get(o.id);
        const allowed = o.allow.toArray();
        const denied = o.deny.toArray();
        return `**${target?.name || 'Unknown'}**\n  Allow: ${allowed.join(', ') || 'None'}\n  Deny: ${denied.join(', ') || 'None'}`;
      }).join('\n\n');

      return interaction.reply({ embeds: [infoEmbed(list.slice(0, 4000))] });
    }

    return interaction.reply({ embeds: [errorEmbed('Invalid subcommand. Use `set`, `remove`, or `list`.')] });
  }
};
