const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backuplist')
    .setDescription('List all server backups')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['backups', 'blist'],
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

      const backups = global.serverBackups?.[guild.id] || [];

      const embed = new EmbedBuilder()
        .setTitle('💾 Server Backups')
        .setDescription(backups.length > 0 ? `Found **${backups.length}** backup(s):` : 'No backups found.')
        .setColor(backups.length > 0 ? 0x0099ff : 0x57f287)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      if (backups.length > 0) {
        const backupList = backups.slice(0, 15).map((b, i) => {
          return `**${i + 1}.** ${b.name}\n> ID: \`${b.id}\` | By: ${b.createdBy}\n> Channels: ${b.channelCount} | Roles: ${b.roleCount} | Members: ${b.memberCount}\n> Created: <t:${Math.floor(b.createdAt / 1000)}:R>`;
        }).join('\n\n');

        embed.addFields({
          name: '📋 Backups',
          value: backupList.substring(0, 2048),
          inline: false
        });
      }

      embed.addFields({
        name: '💡 Tip',
        value: 'Use `backuprestore <id>` to restore from a backup.',
        inline: false
      });

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while listing backups.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
