const { getGuild } = require('../db/guildRepository');
const { checkAntiNukeChannelDelete } = require('../utils/securityEnforcer');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');
const securityEngine = require('../utils/securityEngine');

module.exports = {
  name: 'channelDelete',
  async execute(channel) {
    if (!channel.guild) return;

    try {
      const auditLogs = await channel.guild.fetchAuditLogs({ limit: 5, type: 12 });
      const entry = auditLogs.entries.first();
      if (!entry || !entry.executor) return;

      const executorId = entry.executor.id;
      if (entry.executor.bot) return;
      if (Date.now() - entry.createdTimestamp > 5000) return;

      const guildData = await getGuild(channel.guild.id);

      if (securityEngine.isFrozen(channel.guild.id, 'channels')) {
        logger.warn(`[Freeze] Channel delete blocked during freeze: #${channel.name}`);
        return;
      }

      // Auto-snapshot before destruction
      if (guildData.antinuke_enabled) {
        try {
          const existingSnapshots = await securityEngine.getSnapshots(channel.guild.id);
          const lastSnapshot = existingSnapshots[0];
          if (!lastSnapshot || Date.now() - lastSnapshot.created_at > 300000) {
            securityEngine.createSnapshot(channel.guild.id, channel.guild.client);
          }
        } catch (e) {}
      }

      securityEngine.recordAction(channel.guild.id, executorId, 'channel_delete', {
        channel: channel.name,
        channelId: channel.id,
        channelType: channel.type
      });

      await addSecurityLog({
        guild_id: channel.guild.id,
        user_id: executorId,
        action: 'channel_delete',
        type: 'antinuke',
        details: JSON.stringify({ channelName: channel.name, channelId: channel.id, channelType: channel.type })
      });

      const result = await checkAntiNukeChannelDelete(channel.guild, guildData, executorId, channel.name);
      if (result) {
        logger.info(`[Anti-Nuke] ${result.user} ${result.action} for deleting #${channel.name}`);
      }
    } catch (err) {
      logger.error('channelDelete anti-nuke check error:', err);
    }
  }
};
