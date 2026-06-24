const { getGuild } = require('../db/guildRepository');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');
const securityEngine = require('../utils/securityEngine');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'webhooksUpdate',
  async execute(channel) {
    if (!channel.guild) return;

    try {
      const guildData = await getGuild(channel.guild.id);
      if (!guildData.antinuke_enabled) return;

      const auditLogs = await channel.guild.fetchAuditLogs({ limit: 5, type: 31 });
      const entry = auditLogs.entries.first();
      if (!entry || !entry.executor) return;
      if (entry.executor.bot) return;
      if (Date.now() - entry.createdTimestamp > 5000) return;

      securityEngine.recordAction(channel.guild.id, entry.executor.id, 'webhook_update', {
        channel: channel.name,
        channelId: channel.id
      });

      await addSecurityLog({
        guild_id: channel.guild.id,
        user_id: entry.executor.id,
        action: 'webhook_update',
        type: 'antinuke',
        details: JSON.stringify({ channel: channel.name, channelId: channel.id })
      });

      // Rate limit webhook creation
      const key = `webhook:${channel.guild.id}:${entry.executor.id}`;
      if (!globalThis._webhookTracker) globalThis._webhookTracker = new Map();
      const timestamps = globalThis._webhookTracker.get(key) || [];
      timestamps.push(Date.now());
      const recent = timestamps.filter(t => Date.now() - t < 60000);
      globalThis._webhookTracker.set(key, recent);

      if (recent.length >= 3) {
        const member = await channel.guild.members.fetch(entry.executor.id).catch(() => null);
        if (member) {
          await member.ban({ reason: 'Anti-nuke: mass webhook creation' }).catch(() => {});
          const logChannel = guildData.log_channel ? channel.guild.channels.cache.get(guildData.log_channel) : null;
          if (logChannel) {
            logChannel.send({ embeds: [new EmbedBuilder()
              .setColor(0xff0000)
              .setTitle('🚨 Webhook Abuse Detected')
              .setDescription(`${entry.executor.tag} created ${recent.length} webhooks in 60s — BANNED`)
              .setTimestamp()] }).catch(() => {});
          }
        }
      }
    } catch (err) {
      logger.error('webhooksUpdate error:', err);
    }
  }
};
