const { getGuild } = require('../db/guildRepository');
const { isOwner } = require('../utils/securityEnforcer');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage) {
    if (!oldMessage.guild) return;
    if (!oldMessage.author || oldMessage.author.bot) return;
    if (oldMessage.content === newMessage.content) return;

    try {
      const guildData = await getGuild(oldMessage.guild.id);
      if (!guildData.antinuke_enabled) return;
      if (isOwner(oldMessage.author.id)) return;

      const wl = JSON.parse(guildData.whitelist || '[]');
      if (wl.includes(oldMessage.author.id)) return;

      // Track edit patterns for spam detection
      const editTrackerKey = `edits:${oldMessage.guild.id}:${oldMessage.author.id}`;
      if (!globalThis._editTrackers) globalThis._editTrackers = new Map();
      if (!globalThis._editTrackers.has(editTrackerKey)) globalThis._editTrackers.set(editTrackerKey, []);

      const edits = globalThis._editTrackers.get(editTrackerKey);
      const now = Date.now();
      edits.push(now);
      const recent = edits.filter(t => now - t < 60000);
      globalThis._editTrackers.set(editTrackerKey, recent);

      // Mass edit detection (potential raid evasion or raid activity)
      if (recent.length >= 10) {
        await addSecurityLog({
          guild_id: oldMessage.guild.id,
          user_id: oldMessage.author.id,
          action: 'mass_message_edit',
          type: 'security',
          details: JSON.stringify({
            editCount: recent.length,
            timeWindow: '60s',
            channelId: oldMessage.channel.id,
            oldContent: oldMessage.content.substring(0, 200),
            newContent: newMessage.content.substring(0, 200)
          })
        });

        const logChannel = guildData.log_channel ? oldMessage.guild.channels.cache.get(guildData.log_channel) : null;
        if (logChannel) {
          logChannel.send({
            embeds: [new (require('discord.js').EmbedBuilder)()
              .setColor(0xffff00)
              .setTitle('⚠️ Mass Edit Detected')
              .setDescription(`${oldMessage.author.tag} (${oldMessage.author.id}) edited ${recent.length} messages in 60s`)
              .addFields(
                { name: 'Channel', value: `<#${oldMessage.channel.id}>`, inline: true },
                { name: 'Count', value: `${recent.length}`, inline: true }
              )
              .setTimestamp()
            ]
          }).catch(() => {});
        }
      }

      // Delete message edits older than 5 minutes from tracker
      if (edits.length > 100) {
        globalThis._editTrackers.set(editTrackerKey, recent);
      }
    } catch (err) {
      logger.error('messageUpdate error:', err);
    }
  }
};
