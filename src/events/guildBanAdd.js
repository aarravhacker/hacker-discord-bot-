const { getGuild } = require('../db/guildRepository');
const { checkAntiNukeMassBan, ensureBypassRoles } = require('../utils/securityEnforcer');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');
const securityEngine = require('../utils/securityEngine');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban) {
    if (!ban.guild) return;
    if (ban.user.bot) return;

    try {
      const auditLogs = await ban.guild.fetchAuditLogs({ limit: 5, type: 22 });
      const entry = auditLogs.entries.first();
      if (!entry || !entry.executor) return;
      if (entry.executor.bot) return;
      if (Date.now() - entry.createdTimestamp > 5000) return;

      const executorId = entry.executor.id;
      const guildData = await getGuild(ban.guild.id);
      await ensureBypassRoles(ban.guild, guildData);

      if (securityEngine.isFrozen(ban.guild.id, 'global')) {
        logger.warn(`[Freeze] Ban action blocked during freeze: ${ban.user.tag}`);
        return;
      }

      securityEngine.recordAction(ban.guild.id, executorId, 'member_ban', {
        target: ban.user.id,
        targetTag: ban.user.tag,
        reason: ban.reason || 'No reason provided'
      });

      await addSecurityLog({
        guild_id: ban.guild.id,
        user_id: executorId,
        action: 'member_ban',
        type: 'antinuke',
        details: JSON.stringify({ target: ban.user.id, targetTag: ban.user.tag, reason: ban.reason })
      });

      const targetIds = [ban.user.id];
      const result = await checkAntiNukeMassBan(ban.guild, guildData, executorId, targetIds);
      if (result) {
        logger.info(`[Anti-Nuke] ${result.user} ${result.action} for mass ban`);
      }
    } catch (err) {
      logger.error('guildBanAdd anti-nuke check error:', err);
    }
  }
};
