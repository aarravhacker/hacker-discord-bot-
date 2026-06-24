const { getGuild } = require('../db/guildRepository');
const { checkAntiNukeRoleDelete } = require('../utils/securityEnforcer');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');
const securityEngine = require('../utils/securityEngine');

module.exports = {
  name: 'roleDelete',
  async execute(role) {
    if (!role.guild) return;

    try {
      const auditLogs = await role.guild.fetchAuditLogs({ limit: 5, type: 32 });
      const entry = auditLogs.entries.first();
      if (!entry || !entry.executor) return;

      const executorId = entry.executor.id;
      if (entry.executor.bot) return;
      if (Date.now() - entry.createdTimestamp > 5000) return;

      const guildData = await getGuild(role.guild.id);

      if (securityEngine.isFrozen(role.guild.id, 'roles')) {
        logger.warn(`[Freeze] Role delete blocked during freeze: @${role.name}`);
        return;
      }

      securityEngine.recordAction(role.guild.id, executorId, 'role_delete', {
        roleName: role.name,
        roleId: role.id,
        roleColor: role.color,
        rolePermissions: role.permissions.bitfield
      });

      await addSecurityLog({
        guild_id: role.guild.id,
        user_id: executorId,
        action: 'role_delete',
        type: 'antinuke',
        details: JSON.stringify({ roleName: role.name, roleId: role.id })
      });

      const result = await checkAntiNukeRoleDelete(role.guild, guildData, executorId, role.name);
      if (result) {
        logger.info(`[Anti-Nuke] ${result.user} ${result.action} for deleting role @${role.name}`);
      }
    } catch (err) {
      logger.error('roleDelete anti-nuke check error:', err);
    }
  }
};
