const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backupcompare')
    .setDescription('Compare a backup with current server state')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('id').setDescription('Backup ID to compare').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['bcompare', 'bcomp'],
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
          .setDescription('Please provide a backup ID to compare.');
        return interaction.reply({ embeds: [embed] });
      }

      const backups = global.serverBackups?.[guild.id] || [];
      const backup = backups.find(b => b.id === backupId);

      if (!backup) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription(`Backup \`${backupId}\` not found.`);
        return interaction.reply({ embeds: [embed] });
      }

      const loadingEmbed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setDescription('🔄 Comparing backup with current state...')
        .setTimestamp();
      await interaction.reply({ embeds: [loadingEmbed] });

      const currentSnapshot = await securityEngine.createSnapshot(guild.id, interaction.client);
      const backupSnapshot = backup.snapshot;

      if (!currentSnapshot || !backupSnapshot) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription('Failed to create comparison snapshot.');
        return interaction.editReply({ embeds: [embed] });
      }

      const backupChannels = new Set((backupSnapshot.channels || []).map(c => c.id));
      const currentChannels = new Set((currentSnapshot.channels || []).map(c => c.id));
      const backupRoles = new Set((backupSnapshot.roles || []).map(r => r.id));
      const currentRoles = new Set((currentSnapshot.roles || []).map(r => r.id));

      const addedChannels = [...currentChannels].filter(id => !backupChannels.has(id));
      const removedChannels = [...backupChannels].filter(id => !currentChannels.has(id));
      const addedRoles = [...currentRoles].filter(id => !backupRoles.has(id));
      const removedRoles = [...backupRoles].filter(id => !currentRoles.has(id));

      let color = 0x00ff00;
      const totalChanges = addedChannels.length + removedChannels.length + addedRoles.length + removedRoles.length;
      if (totalChanges > 5) color = 0xff6600;
      if (totalChanges > 10) color = 0xff0000;

      const embed = new EmbedBuilder()
        .setTitle('📊 Backup vs Current State')
        .setDescription(`Comparing backup **${backup.name}** with current server state.`)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      embed.addFields({
        name: '💾 Backup',
        value: `Name: ${backup.name}\nChannels: **${backupChannels.size}** | Roles: **${backupRoles.size}**\nCreated: <t:${Math.floor(backup.createdAt / 1000)}:R>`,
        inline: true
      });

      embed.addFields({
        name: '📍 Current',
        value: `Channels: **${currentChannels.size}** | Roles: **${currentRoles.size}**\nSnapshot: Just now`,
        inline: true
      });

      const changes = [];
      if (addedChannels.length > 0) changes.push(`➕ **${addedChannels.length}** channels added since backup`);
      if (removedChannels.length > 0) changes.push(`➖ **${removedChannels.length}** channels removed since backup`);
      if (addedRoles.length > 0) changes.push(`➕ **${addedRoles.length}** roles added since backup`);
      if (removedRoles.length > 0) changes.push(`➖ **${removedRoles.length}** roles removed since backup`);

      if (changes.length > 0) {
        embed.addFields({
          name: '📋 Changes Since Backup',
          value: changes.join('\n'),
          inline: false
        });
      } else {
        embed.addFields({
          name: '✅ No Changes',
          value: 'Server state matches the backup.',
          inline: false
        });
      }

      if (totalChanges > 0) {
        embed.addFields({
          name: '💡 Suggestion',
          value: 'Consider creating a new backup to capture the current state.',
          inline: false
        });
      }

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while comparing the backup.')
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
