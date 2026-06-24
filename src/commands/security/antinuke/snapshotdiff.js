const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('snapshotdiff')
    .setDescription('Compare two server snapshots')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('snapshot1').setDescription('First snapshot timestamp or ID').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('snapshot2').setDescription('Second snapshot timestamp or ID').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['snapdiff', 'sdiff'],
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

      const snap1Id = isSlash ? interaction.options.getString('snapshot1') : (args[0] || '');
      const snap2Id = isSlash ? interaction.options.getString('snapshot2') : (args[1] || '');

      if (!snap1Id || !snap2Id) {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('Please provide two snapshot timestamps or IDs to compare.');
        return interaction.reply({ embeds: [embed] });
      }

      const loadingEmbed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setDescription('🔄 Comparing snapshots...')
        .setTimestamp();
      await interaction.reply({ embeds: [loadingEmbed] });

      const snapshots = await securityEngine.getSnapshots(guild.id);
      const snap1 = snapshots?.find(s => String(s.timestamp) === snap1Id || s.id === snap1Id);
      const snap2 = snapshots?.find(s => String(s.timestamp) === snap2Id || s.id === snap2Id);

      if (!snap1 || !snap2) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription('One or both snapshots not found. Use `snapshot list` to see available snapshots.');
        return interaction.editReply({ embeds: [embed] });
      }

      const channels1 = new Map((snap1.channels || []).map(c => [c.id, c]));
      const channels2 = new Map((snap2.channels || []).map(c => [c.id, c]));
      const roles1 = new Map((snap1.roles || []).map(r => [r.id, r]));
      const roles2 = new Map((snap2.roles || []).map(r => [r.id, r]));
      const members1 = new Map((snap1.members || []).map(m => [m.id, m]));
      const members2 = new Map((snap2.members || []).map(m => [m.id, m]));

      const addedChannels = [...channels2.keys()].filter(k => !channels1.has(k));
      const removedChannels = [...channels1.keys()].filter(k => !channels2.has(k));
      const addedRoles = [...roles2.keys()].filter(k => !roles1.has(k));
      const removedRoles = [...roles1.keys()].filter(k => !roles2.has(k));
      const addedMembers = [...members2.keys()].filter(k => !members1.has(k));
      const removedMembers = [...members1.keys()].filter(k => !members2.has(k));

      const modifiedRoles = [];
      for (const [id, r2] of roles2) {
        const r1 = roles1.get(id);
        if (r1 && r1.permissions !== r2.permissions) {
          modifiedRoles.push({ name: r2.name, oldPerms: r1.permissions, newPerms: r2.permissions });
        }
      }

      let color = 0x00ff00;
      if (addedChannels.length + removedChannels.length + addedRoles.length + removedRoles.length > 5) color = 0xff6600;
      if (addedChannels.length + removedChannels.length > 10 || addedRoles.length + removedRoles.length > 5) color = 0xff0000;

      const embed = new EmbedBuilder()
        .setTitle('📊 Snapshot Comparison')
        .setDescription(`Comparing snapshot \`${snap1Id}\` with \`${snap2Id}\`.`)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      embed.addFields({
        name: '📅 Snapshot 1',
        value: `Time: <t:${Math.floor((snap1.timestamp || 0) / 1000)}:F>\nChannels: ${snap1.channelCount || snap1.channels?.length || 0} | Roles: ${snap1.roleCount || snap1.roles?.length || 0}`,
        inline: true
      });

      embed.addFields({
        name: '📅 Snapshot 2',
        value: `Time: <t:${Math.floor((snap2.timestamp || 0) / 1000)}:F>\nChannels: ${snap2.channelCount || snap2.channels?.length || 0} | Roles: ${snap2.roleCount || snap2.roles?.length || 0}`,
        inline: true
      });

      const changes = [];
      if (addedChannels.length > 0) changes.push(`➕ **${addedChannels.length}** channels added`);
      if (removedChannels.length > 0) changes.push(`➖ **${removedChannels.length}** channels removed`);
      if (addedRoles.length > 0) changes.push(`➕ **${addedRoles.length}** roles added`);
      if (removedRoles.length > 0) changes.push(`➖ **${removedRoles.length}** roles removed`);
      if (addedMembers.length > 0) changes.push(`➕ **${addedMembers.length}** members joined`);
      if (removedMembers.length > 0) changes.push(`➖ **${removedMembers.length}** members left`);
      if (modifiedRoles.length > 0) changes.push(`🔄 **${modifiedRoles.length}** roles modified`);

      if (changes.length > 0) {
        embed.addFields({
          name: '📋 Changes Detected',
          value: changes.join('\n'),
          inline: false
        });
      } else {
        embed.addFields({
          name: '✅ No Changes',
          value: 'Both snapshots are identical.',
          inline: false
        });
      }

      if (modifiedRoles.length > 0) {
        const roleChanges = modifiedRoles.slice(0, 5).map(r =>
          `• **${r.name}**: Permissions changed`
        ).join('\n');
        embed.addFields({
          name: '🔄 Role Modifications',
          value: roleChanges,
          inline: false
        });
      }

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while comparing snapshots.')
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
