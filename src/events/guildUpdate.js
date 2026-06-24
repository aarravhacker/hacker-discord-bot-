const { getGuild } = require('../db/guildRepository');
const { checkAntiNukeGuildUpdate } = require('../utils/securityEnforcer');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');
const securityEngine = require('../utils/securityEngine');

module.exports = {
  name: 'guildUpdate',
  async execute(oldGuild, newGuild) {
    if (!newGuild) return;

    try {
      const auditLogs = await newGuild.fetchAuditLogs({ limit: 5, type: 1 });
      const entry = auditLogs.entries.first();
      if (!entry || !entry.executor) return;
      if (entry.executor.bot) return;
      if (Date.now() - entry.createdTimestamp > 5000) return;

      const executorId = entry.executor.id;
      const changes = [];

      if (oldGuild.name !== newGuild.name) changes.push(`name: "${oldGuild.name}" -> "${newGuild.name}"`);
      if (oldGuild.icon !== newGuild.icon) changes.push('icon changed');
      if (oldGuild.splash !== newGuild.splash) changes.push('splash changed');
      if (oldGuild.banner !== newGuild.banner) changes.push('banner changed');

      if (changes.length > 0) {
        const guildData = await getGuild(newGuild.id);

        securityEngine.recordAction(newGuild.id, executorId, 'guild_update', {
          changes: changes.join(', ')
        });

        await addSecurityLog({
          guild_id: newGuild.id,
          user_id: executorId,
          action: 'guild_update',
          type: 'antinuke',
          details: JSON.stringify({ changes })
        });

        // Auto-revert critical changes when antinuke enabled
        if (guildData.antinuke_enabled) {
          const criticalChanges = ['icon', 'name', 'splash', 'banner'];
          const detected = [];
          if (oldGuild.icon !== newGuild.icon) detected.push('icon');
          if (oldGuild.name !== newGuild.name) detected.push('name');
          if (oldGuild.splash !== newGuild.splash) detected.push('splash');
          if (oldGuild.banner !== newGuild.banner) detected.push('banner');

          if (detected.length > 0) {
            try {
              if (detected.includes('icon')) await newGuild.setIcon(oldGuild.iconURL(), 'Anti-nuke: auto-revert icon');
              if (detected.includes('name')) await newGuild.setName(oldGuild.name, 'Anti-nuke: auto-revert name');
              if (detected.includes('splash')) await newGuild.setSplash(oldGuild.splashURL(), 'Anti-nuke: auto-revert splash');
              if (detected.includes('banner')) await newGuild.setBanner(oldGuild.bannerURL(), 'Anti-nuke: auto-revert banner');
              logger.info(`[Anti-Nuke] Auto-reverted guild changes: ${detected.join(', ')}`);
            } catch (e) {
              logger.error('Auto-revert guild changes failed:', e);
            }
          }
        }

        const result = await checkAntiNukeGuildUpdate(newGuild, guildData, executorId, changes);
        if (result) {
          logger.info(`[Anti-Nuke] ${result.user} ${result.action} for guild update`);
        }
      }
    } catch (err) {
      logger.error('guildUpdate anti-nuke check error:', err);
    }
  }
};