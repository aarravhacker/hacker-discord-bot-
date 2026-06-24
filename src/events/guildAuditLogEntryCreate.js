const { getGuild } = require('../db/guildRepository');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');
const securityEngine = require('../utils/securityEngine');

module.exports = {
  name: 'guildAuditLogEntryCreate',
  async execute(entry, guild) {
    if (!guild) return;
    if (entry.executor?.bot) return;

    try {
      const guildData = await getGuild(guild.id);
      if (!guildData.antinuke_enabled) return;

      securityEngine.recordAction(guild.id, entry.executor?.id || 'unknown', `audit_${entry.action}`, {
        target: entry.targetId,
        reason: entry.reason,
        changes: entry.changes
      });

      await addSecurityLog({
        guild_id: guild.id,
        user_id: entry.executor?.id || 'unknown',
        action: `audit_log_${entry.action}`,
        type: 'security',
        details: JSON.stringify({ target: entry.targetId, reason: entry.reason })
      });
    } catch (err) {
      logger.error('guildAuditLogEntryCreate error:', err);
    }
  }
};
