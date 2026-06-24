const { getGuild } = require('../db/guildRepository');
const { isOwner } = require('../utils/securityEnforcer');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    if (!oldState.guild) return;

    try {
      const member = newState.member || oldState.member;
      if (!member) return;
      if (member.user.bot) return;
      if (isOwner(member.user.id)) return;

      const guildData = await getGuild(oldState.guild.id);
      if (!guildData.antinuke_enabled) return;

      const wl = JSON.parse(guildData.whitelist || '[]');
      if (wl.includes(member.user.id)) return;

      // Detect mass voice disconnect (someone kicking many users from voice)
      if (oldState.channel && !newState.channel) {
        const auditLogs = await oldState.guild.fetchAuditLogs({ limit: 5, type: 24 });
        const entry = auditLogs.entries.first();
        if (entry && entry.executor && !entry.executor.bot) {
          const executorId = entry.executor.id;
          if (executorId !== member.user.id) {
            // Someone else moved/disconnected this user
            await addSecurityLog({
              guild_id: oldState.guild.id,
              user_id: executorId,
              action: 'voice_disconnect',
              type: 'security',
              details: JSON.stringify({
                target: member.user.id,
                targetTag: member.user.tag,
                channel: oldState.channel.name
              })
            });
          }
        }
      }

      // Detect sudden mass voice state changes (potential raid/griefing)
      if (oldState.channelId !== newState.channelId) {
        const logChannel = guildData.log_channel ? oldState.guild.channels.cache.get(guildData.log_channel) : null;
        if (logChannel) {
          const action = !oldState.channel && newState.channel ? 'joined' :
                         oldState.channel && !newState.channel ? 'left' : 'moved';
          const channelName = (newState.channel || oldState.channel)?.name || 'unknown';

          // Only log joins to reduce noise, staff can check audit logs for leave/move
          if (action === 'joined') {
            const recentJoins = [];
            oldState.guild.members.cache.forEach(m => {
              if (m.voice.channelId === newState.channelId && !m.user.bot) {
                recentJoins.push(m);
              }
            });

            if (recentJoins.length >= 5) {
              logger.info(`[Voice Monitor] ${recentJoins.length} users in voice channel ${channelName}`);
            }
          }
        }
      }
    } catch (err) {
      logger.error('voiceStateUpdate error:', err);
    }
  }
};
