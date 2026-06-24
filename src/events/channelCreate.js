const { getGuild } = require('../db/guildRepository');
const { checkAntiNukeChannelCreate } = require('../utils/securityEnforcer');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');
const securityEngine = require('../utils/securityEngine');

module.exports = {
  name: 'channelCreate',
  async execute(channel) {
    if (!channel.guild) return;

    try {
      const auditLogs = await channel.guild.fetchAuditLogs({ limit: 5, type: 10 });
      const entry = auditLogs.entries.first();
      if (!entry || !entry.executor) return;

      const executorId = entry.executor.id;
      if (entry.executor.bot) return;
      if (Date.now() - entry.createdTimestamp > 5000) return;

      const guildData = await getGuild(channel.guild.id);

      if (securityEngine.isFrozen(channel.guild.id, 'channels')) {
        logger.warn(`[Freeze] Channel create blocked during freeze: #${channel.name}`);
        return;
      }

      securityEngine.recordAction(channel.guild.id, executorId, 'channel_create', {
        channel: channel.name,
        channelId: channel.id,
        channelType: channel.type
      });

      await addSecurityLog({
        guild_id: channel.guild.id,
        user_id: executorId,
        action: 'channel_create',
        type: 'antinuke',
        details: JSON.stringify({ channelName: channel.name, channelId: channel.id })
      });

      const result = await checkAntiNukeChannelCreate(channel.guild, guildData, executorId, channel.name);
      if (result) {
        logger.info(`[Anti-Nuke] ${result.user} ${result.action} for creating #${channel.name}`);
      }
    } catch (err) {
      logger.error('channelCreate anti-nuke check error:', err);
    }
  }
};
