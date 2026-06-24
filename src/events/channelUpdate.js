const { getGuild } = require('../db/guildRepository');
const { isOwner } = require('../utils/securityEnforcer');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');
const securityEngine = require('../utils/securityEngine');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'channelUpdate',
  async execute(oldChannel, newChannel) {
    if (!newChannel.guild) return;

    try {
      const auditLogs = await newChannel.guild.fetchAuditLogs({ limit: 5, type: 14 });
      const entry = auditLogs.entries.first();
      if (!entry || !entry.executor) return;
      if (Date.now() - entry.createdTimestamp > 5000) return;

      const executorId = entry.executor.id;
      const guildData = await getGuild(newChannel.guild.id);

      if (!guildData.antinuke_enabled || isOwner(executorId)) return;

      const wl = JSON.parse(guildData.whitelist || '[]');
      if (wl.includes(executorId)) return;

      const oldPerms = oldChannel.permissionOverwrites?.cache;
      const newPerms = newChannel.permissionOverwrites?.cache;

      if (oldPerms && newPerms && oldPerms.size !== newPerms.size) {
        securityEngine.recordAction(newChannel.guild.id, executorId, 'channel_permission_change', {
          channel: newChannel.name,
          channelId: newChannel.id,
          oldPermCount: oldPerms.size,
          newPermCount: newPerms.size
        });

        await addSecurityLog({
          guild_id: newChannel.guild.id,
          user_id: executorId,
          action: 'channel_permission_change',
          type: 'antinuke',
          details: JSON.stringify({ channel: newChannel.name, channelId: newChannel.id })
        });

        // Channel overwrite mass-change detection
        const key = `perm_change:${newChannel.guild.id}:${executorId}`;
        if (!globalThis._permChangeTracker) globalThis._permChangeTracker = new Map();
        const timestamps = globalThis._permChangeTracker.get(key) || [];
        timestamps.push(Date.now());
        const recent = timestamps.filter(t => Date.now() - t < 30000);
        globalThis._permChangeTracker.set(key, recent);

        if (recent.length >= 3) {
          const logChannel = guildData.log_channel ? newChannel.guild.channels.cache.get(guildData.log_channel) : null;
          if (logChannel) {
            logChannel.send({ embeds: [new EmbedBuilder()
              .setColor(0xff0000)
              .setTitle('🚨 Mass Permission Changes')
              .setDescription(`${executorId} changed permissions on ${recent.length} channels in 30s`)
              .setTimestamp()] }).catch(() => {});
          }
        }

        logger.info(`[Anti-Nuke] Permission change on #${newChannel.name} by ${entry.executor.tag}`);
      }
    } catch (err) {
      logger.error('channelUpdate error:', err);
    }
  }
};
