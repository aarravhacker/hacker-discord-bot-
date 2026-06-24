const { getGuild } = require('../db/guildRepository');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildBanRemove',
  async execute(ban) {
    if (!ban.guild) return;

    try {
      const auditLogs = await ban.guild.fetchAuditLogs({ limit: 5, type: 23 });
      const entry = auditLogs.entries.first();
      if (!entry || !entry.executor) return;

      await addSecurityLog({
        guild_id: ban.guild.id,
        user_id: entry.executor.id,
        action: 'unban',
        type: 'antinuke',
        details: JSON.stringify({ target: ban.user.id, targetTag: ban.user.tag })
      });
      logger.info(`[Unban] ${ban.user.tag} unbanned by ${entry.executor.tag}`);
    } catch (err) {
      logger.error('guildBanRemove error:', err);
    }
  }
};
