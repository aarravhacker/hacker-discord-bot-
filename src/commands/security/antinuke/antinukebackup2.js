const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukebackup2')
    .setDescription('Create, list, or restore antinuke backups')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('create').setDescription('Create a new backup'))
    .addSubcommand(sub => sub.setName('list').setDescription('List all available backups'))
    .addSubcommand(sub => sub.setName('restore').setDescription('Restore a backup')
      .addStringOption(opt => opt.setName('backup_id').setDescription('The backup ID to restore').setRequired(false))),

  cooldown: 10,
  aliases: ['anbackup2', 'abackup2'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Permission Denied')
        .setDescription('You need Administrator permission to use this command.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'list');
    const validSubs = ['create', 'list', 'restore'];
    if (!validSubs.includes(subcommand)) {
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('⚠️ Invalid Subcommand')
        .setDescription(`Valid subcommands: ${validSubs.join(', ')}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      if (subcommand === 'create') {
        const result = await securityEngine.createBackup(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('📦 Backup Created')
          .setDescription('Successfully created a new antinuke backup.')
          .addFields(
            { name: 'Backup ID', value: result?.backupId || 'N/A', inline: true },
            { name: 'Server', value: interaction.guild.name, inline: true },
            { name: 'Created By', value: user.tag, inline: true },
            { name: 'Channels Backed Up', value: String(result?.channels || 0), inline: true },
            { name: 'Roles Backed Up', value: String(result?.roles || 0), inline: true },
            { name: 'Permissions Backed Up', value: String(result?.permissions || 0), inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'list') {
        const backups = await securityEngine.listBackups(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('📦 Antinuke Backups')
          .setDescription(backups?.length ? backups.map(b => `**${b.id}** - ${b.createdAt} by ${b.createdBy}`).join('\n') : 'No backups found.')
          .setFooter({ text: `Total: ${backups?.length || 0} backups` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'restore') {
        const backupId = isSlash ? interaction.options.getString('backup_id') : args[1];
        if (!backupId) {
          const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle('⚠️ Missing Backup ID')
            .setDescription('Please provide a backup ID to restore.')
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }
        const result = await securityEngine.restoreBackup(interaction.guild.id, backupId);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('📦 Backup Restored')
          .setDescription(result?.message || `Successfully restored backup \`${backupId}\`.`)
          .addFields(
            { name: 'Backup ID', value: backupId, inline: true },
            { name: 'Restored By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(`Backup operation failed: ${error.message}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};
