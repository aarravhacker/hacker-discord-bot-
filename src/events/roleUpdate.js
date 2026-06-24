const { getGuild } = require('../db/guildRepository');
const { checkAntiNukeRoleUpdate } = require('../utils/securityEnforcer');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');
const securityEngine = require('../utils/securityEngine');

module.exports = {
  name: 'roleUpdate',
  async execute(oldRole, newRole) {
    if (!newRole.guild) return;

    try {
      const auditLogs = await newRole.guild.fetchAuditLogs({ limit: 5, type: 31 });
      const entry = auditLogs.entries.first();
      if (!entry || !entry.executor) return;
      if (entry.executor.bot) return;
      if (Date.now() - entry.createdTimestamp > 5000) return;

      const executorId = entry.executor.id;
      const changeDesc = [];
      let changed = false;

      if (oldRole.name !== newRole.name) {
        changeDesc.push(`renamed "@${oldRole.name}" -> "@${newRole.name}"`);
        changed = true;
      }
      if (oldRole.color !== newRole.color) {
        changeDesc.push('color changed');
        changed = true;
      }
      if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
        changeDesc.push('permissions changed');
        changed = true;
      }

      if (changed) {
        const guildData = await getGuild(newRole.guild.id);

        securityEngine.recordAction(newRole.guild.id, executorId, 'role_change', {
          roleName: newRole.name,
          roleId: newRole.id,
          changes: changeDesc.join(', '),
          permissionChanged: oldRole.permissions.bitfield !== newRole.permissions.bitfield
        });

        await addSecurityLog({
          guild_id: newRole.guild.id,
          user_id: executorId,
          action: 'role_update',
          type: 'antinuke',
          details: JSON.stringify({ roleName: newRole.name, changes: changeDesc })
        });

        const result = await checkAntiNukeRoleUpdate(newRole.guild, guildData, executorId, newRole.name, changeDesc.join(', '));
        if (result) {
          logger.info(`[Anti-Nuke] ${result.user} ${result.action} for role update @${newRole.name}`);
        }
      }
    } catch (err) {
      logger.error('roleUpdate anti-nuke check error:', err);
    }
  }
};