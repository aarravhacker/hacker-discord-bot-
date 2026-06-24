const { getGuild } = require('../db/guildRepository');
const { isOwner } = require('../utils/securityEnforcer');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');

module.exports = {
  name: 'messageDelete',
  async execute(message) {
    if (!message.guild) return;
    if (message.author.bot) return;

    try {
      const guildData = await getGuild(message.guild.id);
      if (!guildData.antinuke_enabled) return;

      // Check if someone else deleted the message (not the author)
      const auditLogs = await message.guild.fetchAuditLogs({ limit: 5, type: 72 });
      const entry = auditLogs.entries.first();

      if (entry && entry.executor && !entry.executor.bot) {
        const executorId = entry.executor.id;
        if (executorId !== message.author.id) {
          if (isOwner(executorId)) return;
          const wl = JSON.parse(guildData.whitelist || '[]');
          if (wl.includes(executorId)) return;

          // Mass delete detection (raid cleanup or cover-up)
          if (!globalThis._deleteTrackers) globalThis._deleteTrackers = new Map();
          const key = `deletes:${message.guild.id}:${executorId}`;
          if (!globalThis._deleteTrackers.has(key)) globalThis._deleteTrackers.set(key, []);

          const deletes = globalThis._deleteTrackers.get(key);
          const now = Date.now();
          deletes.push({ time: now, channelId: message.channel.id });
          const recent = deletes.filter(d => now - d.time < 30000);
          globalThis._deleteTrackers.set(key, recent);

          if (recent.length >= 5) {
            await addSecurityLog({
              guild_id: message.guild.id,
              user_id: executorId,
              action: 'mass_message_delete',
              type: 'antinuke',
              details: JSON.stringify({
                deleteCount: recent.length,
                timeWindow: '30s',
                channel: message.channel.name,
                deletedContent: message.content?.substring(0, 200) || '[no content]'
              })
            });

            const logChannel = guildData.log_channel ? message.guild.channels.cache.get(guildData.log_channel) : null;
            if (logChannel) {
              const { EmbedBuilder } = require('discord.js');
              logChannel.send({
                embeds: [new EmbedBuilder()
                  .setColor(0xff4444)
                  .setTitle('🗑️ Mass Delete Detected')
                  .setDescription(`${entry.executor.tag} (${executorId}) deleted ${recent.length} messages in 30s`)
                  .addFields(
                    { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                    { name: 'Original Author', value: message.author.tag, inline: true }
                  )
                  .setTimestamp()
                ]
              }).catch(() => {});
            }

            // Clean old entries
            if (deletes.length > 50) {
              globalThis._deleteTrackers.set(key, recent);
            }
          }
        }
      }
    } catch (err) {
      logger.error('messageDelete error:', err);
    }
  }
};
