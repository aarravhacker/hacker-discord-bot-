const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { addSecurityLog } = require('../../../db/securityRepository');
const securityEngine = require('../../../utils/securityEngine');
const logger = require('../../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukepermission')
    .setDescription('Auto-detect and prevent permission escalation')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('enable').setDescription('Enable permission escalation detection'))
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Disable permission escalation detection'))
    .addSubcommand(sub =>
      sub.setName('scan').setDescription('Scan all roles for dangerous permissions'))
    .addSubcommand(sub =>
      sub.setName('lock')
        .setDescription('Lock a role to prevent permission changes')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to lock').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('unlock')
        .setDescription('Unlock a locked role')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to unlock').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('locked').setDescription('List all locked roles'))
    .addSubcommand(sub =>
      sub.setName('status').setDescription('View permission protection status')),

  cooldown: 5,
  aliases: ['apermission', 'permguard'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permission.', ephemeral: true });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'status').toLowerCase();
    const guildData = await getGuild(interaction.guild.id);

    if (subcommand === 'enable') {
      const config = JSON.parse(guildData.antinuke_config || '{}');
      config.permissionProtection = true;
      await updateGuild(interaction.guild.id, { antinuke_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription('Permission escalation detection enabled. Roles with Administrator/ManageGuild will be monitored.')] });
    }

    if (subcommand === 'disable') {
      const config = JSON.parse(guildData.antinuke_config || '{}');
      config.permissionProtection = false;
      await updateGuild(interaction.guild.id, { antinuke_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Permission escalation detection disabled.')] });
    }

    if (subcommand === 'scan') {
      await interaction.deferReply();
      const dangerousPerms = ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'BanMembers', 'KickMembers', 'ManageMessages'];
      const flagged = [];

      interaction.guild.roles.cache.forEach(role => {
        if (role.managed || role.id === interaction.guild.id) return;
        const perms = role.permissions.toArray();
        const dangerous = perms.filter(p => dangerousPerms.includes(p));
        if (dangerous.length > 0 && role.members.size > 0) {
          flagged.push({ name: role.name, id: role.id, perms: dangerous, members: role.members.size, color: role.hexColor });
        }
      });

      flagged.sort((a, b) => b.perms.length - a.perms.length);

      const embed = new EmbedBuilder()
        .setColor(flagged.length > 0 ? 0xff8800 : 0x00ff00)
        .setTitle('Permission Scan Results')
        .setDescription(`Found **${flagged.length}** roles with dangerous permissions`)
        .setTimestamp();

      if (flagged.length > 0) {
        const list = flagged.slice(0, 10).map(r => `**${r.name}** (${r.members} members): ${r.perms.join(', ')}`).join('\n\n');
        embed.addFields({ name: 'Flagged Roles', value: list.substring(0, 1024) });
      } else {
        embed.addFields({ name: 'Result', value: 'No roles with excessive dangerous permissions found.' });
      }

      embed.setFooter({ text: `Requested by ${user.tag}` });
      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'lock') {
      const role = isSlash ? interaction.options.getRole('role') : null;
      if (!role) return interaction.reply({ content: 'Provide a role to lock.', ephemeral: true });
      const config = JSON.parse(guildData.antinuke_config || '{}');
      if (!config.lockedRoles) config.lockedRoles = [];
      if (!config.lockedRoles.includes(role.id)) config.lockedRoles.push(role.id);
      await updateGuild(interaction.guild.id, { antinuke_config: JSON.stringify(config) });
      await addSecurityLog({ guild_id: interaction.guild.id, user_id: user.id, action: 'role_locked', type: 'antinuke', details: JSON.stringify({ roleId: role.id, roleName: role.name }) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Role **${role.name}** locked. Permission changes will be blocked.`)] });
    }

    if (subcommand === 'unlock') {
      const role = isSlash ? interaction.options.getRole('role') : null;
      if (!role) return interaction.reply({ content: 'Provide a role to unlock.', ephemeral: true });
      const config = JSON.parse(guildData.antinuke_config || '{}');
      config.lockedRoles = (config.lockedRoles || []).filter(id => id !== role.id);
      await updateGuild(interaction.guild.id, { antinuke_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Role **${role.name}** unlocked.`)] });
    }

    if (subcommand === 'locked') {
      const config = JSON.parse(guildData.antinuke_config || '{}');
      const locked = config.lockedRoles || [];
      const embed = new EmbedBuilder()
        .setColor(locked.length > 0 ? 0xffa500 : 0x00ff00)
        .setTitle('Locked Roles')
        .setDescription(locked.length > 0 ? locked.map(id => `<@&${id}>`).join('\n') : 'No locked roles.');
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'status') {
      const config = JSON.parse(guildData.antinuke_config || '{}');
      const enabled = config.permissionProtection || false;
      const locked = (config.lockedRoles || []).length;
      return interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(enabled ? 0x00ff00 : 0xff0000)
        .setTitle('Permission Protection Status')
        .addFields(
          { name: 'Detection', value: enabled ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Locked Roles', value: `${locked}`, inline: true }
        )
        .setTimestamp()
      ] });
    }
  }
};
