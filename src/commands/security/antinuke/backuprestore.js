const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backuprestore')
    .setDescription('Restore server from a backup')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('id').setDescription('Backup ID to restore').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['restore', 'brestore'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    try {
      if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription('You need Administrator permission to use this command.');
        return interaction.reply({ embeds: [embed] });
      }

      const backupId = isSlash ? interaction.options.getString('id') : (args[0] || '');

      if (!backupId) {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('Please provide a backup ID to restore. Use `backuplist` to see available backups.');
        return interaction.reply({ embeds: [embed] });
      }

      const backups = global.serverBackups?.[guild.id] || [];
      const backup = backups.find(b => b.id === backupId);

      if (!backup) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription(`Backup \`${backupId}\` not found. Use \`backuplist\` to see available backups.`);
        return interaction.reply({ embeds: [embed] });
      }

      const confirmEmbed = new EmbedBuilder()
        .setTitle('⚠️ Confirm Restore')
        .setDescription(`Are you sure you want to restore from backup **${backup.name}**?\n\nThis will modify your server's channels, roles, and permissions.`)
        .setColor(0xed4245)
        .addFields(
          { name: 'Backup', value: backup.name, inline: true },
          { name: 'Created', value: `<t:${Math.floor(backup.createdAt / 1000)}:R>`, inline: true },
          { name: 'By', value: backup.createdBy, inline: true }
        )
        .setFooter({ text: 'This action will modify your server structure.' });

      await interaction.reply({ embeds: [confirmEmbed] });

      const loadingEmbed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setDescription('🔄 Restoring from backup... Please wait.')
        .setTimestamp();
      await interaction.editReply({ embeds: [loadingEmbed] });

      const result = await securityEngine.rollback(guild.id, backup.snapshot.timestamp, interaction.client);

      if (result && result.success) {
        const embed = new EmbedBuilder()
          .setTitle('✅ Backup Restored')
          .setDescription(`Server has been restored from backup **${backup.name}**.`)
          .setColor(0x57f287)
          .addFields(
            { name: 'Channels Restored', value: `**${result.results?.channels || 0}**`, inline: true },
            { name: 'Roles Restored', value: `**${result.results?.roles || 0}**`, inline: true },
            { name: 'Restored By', value: `${user.tag}`, inline: true }
          )
          .setTimestamp();

        securityEngine.logIncident(guild.id, user.id, 'backup_restored', {
          backupId: backup.id,
          backupName: backup.name,
          restoredBy: user.tag
        });

        return interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❌ Restore Failed')
          .setDescription(`Failed to restore from backup **${backup.name}**.\n${result?.error || 'Unknown error'}`)
          .setColor(0xff0000)
          .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while restoring from backup.')
        .setColor(0xff0000)
        .setTimestamp();
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
