const { getGuild } = require('../db/guildRepository');
const { checkAntiNukeMassKick, ensureBypassRoles } = require('../utils/securityEnforcer');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');
const securityEngine = require('../utils/securityEngine');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    if (!member.guild) return;
    if (member.user.bot) return;

    try {
      const auditLogs = await member.guild.fetchAuditLogs({ limit: 5, type: 20 });
      const entry = auditLogs.entries.first();
      if (!entry || !entry.executor) return;
      if (entry.executor.bot) return;
      if (Date.now() - entry.createdTimestamp > 5000) return;

      const executorId = entry.executor.id;
      const guildData = await getGuild(member.guild.id);
      await ensureBypassRoles(member.guild, guildData);

      if (securityEngine.isFrozen(member.guild.id, 'global')) {
        logger.warn(`[Freeze] Kick action blocked during freeze: ${member.user.tag}`);
        return;
      }

      securityEngine.recordAction(member.guild.id, executorId, 'member_kick', {
        target: member.user.id,
        targetTag: member.user.tag
      });

      await addSecurityLog({
        guild_id: member.guild.id,
        user_id: executorId,
        action: 'member_kick',
        type: 'antinuke',
        details: JSON.stringify({ target: member.user.id, targetTag: member.user.tag })
      });

      const targetIds = [member.user.id];
      const result = await checkAntiNukeMassKick(member.guild, guildData, executorId, targetIds);
      if (result) {
        logger.info(`[Anti-Nuke] ${result.user} ${result.action} for mass kick`);
      }
    } catch (err) {
      logger.error('guildMemberRemove anti-nuke check error:', err);
    }
  }
};
