const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../../utils/helpers');
const { addSecurityLog } = require('../../../db/securityRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukebackup')
    .setDescription('Create or restore a server backup')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('action').setDescription('Create or restore').setRequired(true)
        .addChoices({ name: 'create', value: 'create' }, { name: 'restore', value: 'restore' })
    ),
  cooldown: 30,
  aliases: ['anbackup'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const moderator = isSlash ? interaction.user : interaction.author;

    try {
      const action = isSlash ? interaction.options?.getString('action') : interaction.content.split(' ')[1]?.toLowerCase();

      if (!action || !['create', 'restore'].includes(action)) {
        return interaction.reply({ embeds: [errorEmbed('Error', 'Please specify create or restore.')] });
      }

      if (action === 'create') {
        const backup = {
          name: guild.name,
          created_at: new Date().toISOString(),
          created_by: moderator.id,
          channels: guild.channels.cache.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            position: c.position,
            parent: c.parentId
          })),
          roles: guild.roles.cache.map(r => ({
            id: r.id,
            name: r.name,
            color: r.color,
            permissions: r.permissions.bitfield.toString(),
            position: r.position
          })),
          settings: {
            name: guild.name,
            icon: guild.iconURL(),
            verificationLevel: guild.verificationLevel,
            explicitContentFilter: guild.explicitContentFilter
          }
        };

        const guildData = await getGuild(guild.id);
        let antinukeConfig = JSON.parse(guildData.antinuke_config || '{}');
        antinukeConfig.backup = backup;
        await updateGuild(guild.id, { antinuke_config: JSON.stringify(antinukeConfig) });

        await addSecurityLog({
          guild_id: guild.id,
          user_id: moderator.id,
          action: 'antinuke_backup_create',
          type: 'antinuke',
          details: JSON.stringify({ channelCount: backup.channels.length, roleCount: backup.roles.length })
        });

        const embed = successEmbed(
          'Antinuke Backup Created',
          `✅ Server backup created successfully.\n**Channels:** ${backup.channels.length}\n**Roles:** ${backup.roles.length}`
        );

        if (isSlash) {
          await interaction.reply({ embeds: [embed] });
        } else {
          await interaction.reply({ embeds: [embed] });
        }
      } else {
        const guildData = await getGuild(guild.id);
        const antinukeConfig = JSON.parse(guildData.antinuke_config || '{}');
        const backup = antinukeConfig.backup;

        if (!backup) {
          return interaction.reply({ embeds: [errorEmbed('Error', 'No backup found. Create one first.')] });
        }

        let restored = 0;
        for (const roleData of backup.roles) {
          if (roleData.id === guild.id) continue;
          try {
            if (!guild.roles.cache.has(roleData.id)) {
              await guild.roles.create({
                name: roleData.name,
                color: roleData.color,
                permissions: BigInt(roleData.permissions),
                reason: 'Antinuke backup restore'
              });
              restored++;
            }
          } catch { }
        }

        await addSecurityLog({
          guild_id: guild.id,
          user_id: moderator.id,
          action: 'antinuke_backup_restore',
          type: 'antinuke',
          details: JSON.stringify({ restoredRoles: restored })
        });

        const embed = successEmbed(
          'Antinuke Backup Restored',
          `✅ Restored **${restored}** roles from backup.`
        );

        if (isSlash) {
          await interaction.reply({ embeds: [embed] });
        } else {
          await interaction.reply({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to process antinuke backup.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
