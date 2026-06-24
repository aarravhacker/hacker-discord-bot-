const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('evidencecollect')
    .setDescription('Collect evidence for an incident')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('id').setDescription('Incident ID').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['ecollect', 'evid'],
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

      const incidentId = isSlash ? interaction.options.getString('id') : (args[0] || '');

      if (!incidentId) {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('Please provide an incident ID to collect evidence for.');
        return interaction.reply({ embeds: [embed] });
      }

      const incidents = securityEngine.getIncidents(guild.id, 1000);
      const incident = incidents.find(i => String(i.id) === incidentId);

      if (!incident) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription(`Incident \`${incidentId}\` not found.`);
        return interaction.reply({ embeds: [embed] });
      }

      const evidence = {
        incidentId: incident.id,
        collectedAt: Date.now(),
        collectedBy: user.tag,
        incidentType: incident.type,
        incidentTimestamp: incident.timestamp,
        actorId: incident.userId,
        guildId: guild.id,
        guildName: guild.name,
        auditLogs: [],
        memberState: null,
        channelState: null,
        roleState: null
      };

      if (incident.userId && incident.userId !== 'system') {
        const actorMember = guild.members.cache.get(incident.userId);
        if (actorMember) {
          evidence.memberState = {
            id: actorMember.id,
            tag: actorMember.user.tag,
            roles: actorMember.roles.cache.map(r => ({ id: r.id, name: r.name, permissions: r.permissions.bitfield })),
            joinedAt: actorMember.joinedTimestamp,
            highestRole: actorMember.roles.highest.name,
            permissions: actorMember.permissions.bitfield
          };
        }
      }

      evidence.channelState = {
        totalChannels: guild.channels.cache.size,
        channels: guild.channels.cache.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          createdAt: c.createdTimestamp
        }))
      };

      evidence.roleState = {
        totalRoles: guild.roles.cache.size,
        roles: guild.roles.cache.map(r => ({
          id: r.id,
          name: r.name,
          color: r.color,
          permissions: r.permissions.bitfield,
          position: r.position,
          memberCount: r.members.size
        }))
      };

      const profile = incident.userId !== 'system'
        ? securityEngine.getProfile(guild.id, incident.userId)
        : null;

      if (profile) {
        evidence.userProfile = {
          messageCount: profile.messageCount,
          editCount: profile.editCount,
          deleteCount: profile.deleteCount,
          channelCreates: profile.channelCreates,
          channelDeletes: profile.channelDeletes,
          roleChanges: profile.roleChanges,
          permissionEscalations: profile.permissionEscalations,
          memberKicks: profile.memberKicks,
          memberBans: profile.memberBans,
          burstCount: profile.burstCount,
          firstSeen: profile.firstSeen,
          lastActivity: profile.lastActivity
        };
      }

      if (!global.evidenceStore) global.evidenceStore = {};
      if (!global.evidenceStore[guild.id]) global.evidenceStore[guild.id] = [];
      global.evidenceStore[guild.id].push(evidence);

      const embed = new EmbedBuilder()
        .setTitle('🔍 Evidence Collected')
        .setDescription(`Evidence for incident **#${incident.id}** has been collected and preserved.`)
        .setColor(0x0099ff)
        .addFields(
          { name: 'Incident ID', value: `\`${incident.id}\``, inline: true },
          { name: 'Type', value: `**${incident.type}**`, inline: true },
          { name: 'Collected By', value: `${user.tag}`, inline: true },
          { name: 'Actor', value: incident.userId !== 'system' ? `<@${incident.userId}>` : 'System', inline: true },
          { name: 'Channel Snapshots', value: `**${evidence.channelState.totalChannels}**`, inline: true },
          { name: 'Role Snapshots', value: `**${evidence.roleState.totalRoles}**`, inline: true },
          { name: 'Member State', value: evidence.memberState ? '✅ Captured' : '❌ N/A', inline: true },
          { name: 'User Profile', value: evidence.userProfile ? '✅ Captured' : '❌ N/A', inline: true }
        )
        .setTimestamp();

      if (evidence.memberState) {
        embed.addFields({
          name: '👤 Actor State',
          value: `Tag: ${evidence.memberState.tag}\nRoles: ${evidence.memberState.roles.length}\nHighest: ${evidence.memberState.highestRole}\nJoined: <t:${Math.floor(evidence.memberState.joinedAt / 1000)}:R>`,
          inline: false
        });
      }

      securityEngine.logIncident(guild.id, user.id, 'evidence_collected', {
        incidentId: incident.id,
        evidenceTypes: ['channel_state', 'role_state', evidence.memberState ? 'member_state' : null, evidence.userProfile ? 'user_profile' : null].filter(Boolean)
      });

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while collecting evidence.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
