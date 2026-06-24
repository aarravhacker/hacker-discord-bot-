const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('snapshotdelete')
    .setDescription('Delete old server snapshots')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('id').setDescription('Snapshot ID to delete (or "old" to delete snapshots older than 7 days)')
    ),
  cooldown: 5,
  aliases: ['snapdel', 'sdel'],
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

      const target = isSlash ? interaction.options.getString('id') : (args[0] || '');
      const snapshots = await securityEngine.getSnapshots(guild.id);
      const list = snapshots || [];

      if (list.length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('No snapshots found to delete.');
        return interaction.reply({ embeds: [embed] });
      }

      if (target === 'old' || target === 'old') {
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const oldSnapshots = list.filter(s => s.timestamp < sevenDaysAgo);

        if (oldSnapshots.length === 0) {
          const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setDescription('No snapshots older than 7 days found.');
          return interaction.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
          .setTitle('🗑️ Delete Old Snapshots')
          .setDescription(`Found **${oldSnapshots.length}** snapshot(s) older than 7 days.`)
          .setColor(0xff6600)
          .setTimestamp();

        const snapshotList = oldSnapshots.slice(0, 10).map(s =>
          `• Snapshot \`${s.id || s.timestamp}\` — <t:${Math.floor(s.timestamp / 1000)}:R>`
        ).join('\n');

        embed.addFields({
          name: 'Snapshots to Delete',
          value: snapshotList.substring(0, 1024),
          inline: false
        });

        embed.addFields({
          name: '⚠️ Confirmation',
          value: `This will permanently delete **${oldSnapshots.length}** snapshot(s). Run the command again with \`confirm\` to proceed.`,
          inline: false
        });

        if (args.includes('confirm') || args[1] === 'confirm') {
          let deleted = 0;
          for (const snap of oldSnapshots) {
            try {
              if (securityEngine.snapshots) {
                securityEngine.snapshots.delete(`${guild.id}:${snap.timestamp}`);
              }
              deleted++;
            } catch (e) {
              console.error('Failed to delete snapshot:', e);
            }
          }

          const resultEmbed = new EmbedBuilder()
            .setTitle('✅ Snapshots Deleted')
            .setDescription(`Successfully deleted **${deleted}** old snapshot(s).`)
            .setColor(0x57f287)
            .setTimestamp();
          return interaction.reply({ embeds: [resultEmbed] });
        }

        return interaction.reply({ embeds: [embed] });
      }

      if (target) {
        const snap = list.find(s => String(s.timestamp) === target || s.id === target);
        if (!snap) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(`Snapshot \`${target}\` not found.`);
          return interaction.reply({ embeds: [embed] });
        }

        if (securityEngine.snapshots) {
          securityEngine.snapshots.delete(`${guild.id}:${snap.timestamp}`);
        }

        const embed = new EmbedBuilder()
          .setTitle('✅ Snapshot Deleted')
          .setDescription(`Snapshot \`${target}\` has been deleted.`)
          .setColor(0x57f287)
          .addFields(
            { name: 'Snapshot ID', value: `\`${snap.id || snap.timestamp}\``, inline: true },
            { name: 'Created', value: `<t:${Math.floor(snap.timestamp / 1000)}:R>`, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription('Please provide a snapshot ID to delete, or use `old` to delete snapshots older than 7 days.');
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while deleting snapshots.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
