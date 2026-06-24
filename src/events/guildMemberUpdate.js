const { getGuild } = require('../db/guildRepository');
const { isOwner } = require('../utils/securityEnforcer');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');
const securityEngine = require('../utils/securityEngine');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    if (!newMember.guild) return;

    try {
      const guildData = await getGuild(newMember.guild.id);

      // Nickname takeover protection
      if (oldMember.nickname !== newMember.nickname && newMember.nickname) {
        const suspiciousPatterns = /^(admin|mod|owner|staff|bot|system|discord)/i;
        if (suspiciousPatterns.test(newMember.nickname) && !newMember.permissions.has('Administrator')) {
          const logChannel = guildData.log_channel ? newMember.guild.channels.cache.get(guildData.log_channel) : null;
          if (logChannel) {
            logChannel.send({ embeds: [new EmbedBuilder()
              .setColor(0xff6600)
              .setTitle('⚠️ Suspicious Nickname Detected')
              .setDescription(`${newMember.user.tag} changed nickname to **${newMember.nickname}**`)
              .setTimestamp()] }).catch(() => {});
          }
          try { await newMember.setNickname(oldMember.nickname || null, 'Suspicious nickname blocked'); } catch (e) {}
          await addSecurityLog({
            guild_id: newMember.guild.id,
            user_id: newMember.user.id,
            action: 'suspicious_nickname',
            type: 'security',
            details: JSON.stringify({ nickname: newMember.nickname, reverted: true })
          });
        }
      }

      // Role assignment tracking
      const oldRoles = oldMember.roles.cache.map(r => r.id);
      const newRoles = newMember.roles.cache.map(r => r.id);
      const addedRoles = newRoles.filter(r => !oldRoles.includes(r));
      if (addedRoles.length === 0) return;

      const auditLogs = await newMember.guild.fetchAuditLogs({ limit: 5, type: 25 });
      const entry = auditLogs.entries.first();
      if (!entry || !entry.executor) return;
      if (Date.now() - entry.createdTimestamp > 5000) return;

      const executorId = entry.executor.id;

      if (!guildData.antinuke_enabled || isOwner(executorId)) return;

      const wl = JSON.parse(guildData.whitelist || '[]');
      if (wl.includes(executorId)) return;

      securityEngine.recordAction(newMember.guild.id, executorId, 'role_change', {
        target: newMember.user.id,
        targetTag: newMember.user.tag,
        addedRoles,
        roleCount: addedRoles.length
      });

      await addSecurityLog({
        guild_id: newMember.guild.id,
        user_id: executorId,
        action: 'mass_role_assignment',
        type: 'antinuke',
        details: JSON.stringify({ target: newMember.user.id, addedRoles })
      });

      // Role assignment rate limiting
      const key = `role_assign:${newMember.guild.id}:${executorId}`;
      if (!globalThis._roleAssignTracker) globalThis._roleAssignTracker = new Map();
      const timestamps = globalThis._roleAssignTracker.get(key) || [];
      timestamps.push(Date.now());
      const recent = timestamps.filter(t => Date.now() - t < 60000);
      globalThis._roleAssignTracker.set(key, recent);

      if (recent.length >= 5) {
        const executor = await newMember.guild.members.fetch(executorId).catch(() => null);
        if (executor && !executor.permissions.has('Administrator')) {
          await executor.timeout(300000, 'Mass role assignment').catch(() => {});
          const logChannel = guildData.log_channel ? newMember.guild.channels.cache.get(guildData.log_channel) : null;
          if (logChannel) {
            logChannel.send({ embeds: [new EmbedBuilder()
              .setColor(0xff0000)
              .setTitle('🚨 Mass Role Assignment')
              .setDescription(`${executor.user.tag} assigned ${recent.length} roles in 60s — timed out`)
              .setTimestamp()] }).catch(() => {});
          }
        }
      }

      logger.info(`[Anti-Nuke] Roles assigned to ${newMember.user.tag} by ${entry.executor.tag}: ${addedRoles.length} roles`);
    } catch (err) {
      logger.error('guildMemberUpdate error:', err);
    }
  }
};
