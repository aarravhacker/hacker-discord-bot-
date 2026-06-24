const { getGuild } = require('../db/guildRepository');
const { isOwner } = require('../utils/securityEnforcer');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');

module.exports = {
  name: 'presenceUpdate',
  async execute(oldPresence, newPresence) {
    if (!newPresence.guild) return;

    try {
      const member = newPresence.member;
      if (!member) return;
      if (member.user.bot) return;
      if (isOwner(member.user.id)) return;

      const guildData = await getGuild(newPresence.guild.id);
      if (!guildData.antinuke_enabled) return;

      const wl = JSON.parse(guildData.whitelist || '[]');
      if (wl.includes(member.user.id)) return;

      // Detect sudden username/nickname changes (potential impersonation)
      if (oldPresence && oldPresence.member) {
        const oldNick = oldPresence.nickname;
        const newNick = newPresence.nickname;

        if (oldNick !== newNick && newNick) {
          // Check for suspicious name patterns (admin impersonation)
          const suspiciousPatterns = ['admin', 'mod', 'owner', 'staff', 'moderator', 'administrator'];
          const lowerNick = newNick.toLowerCase();
          const isSuspicious = suspiciousPatterns.some(p => lowerNick.includes(p));

          if (isSuspicious) {
            // Check if member is actually staff
            const isStaff = member.roles.cache.some(r =>
              r.permissions.has('Administrator') || r.permissions.has('ManageGuild')
            );

            if (!isStaff) {
              await addSecurityLog({
                guild_id: newPresence.guild.id,
                user_id: member.user.id,
                action: 'suspicious_nickname',
                type: 'security',
                details: JSON.stringify({
                  oldNickname: oldNick || '[none]',
                  newNickname: newNick,
                  reason: 'Non-staff member using staff-like nickname'
                })
              });

              const logChannel = guildData.log_channel ? newPresence.guild.channels.cache.get(guildData.log_channel) : null;
              if (logChannel) {
                const { EmbedBuilder } = require('discord.js');
                logChannel.send({
                  embeds: [new EmbedBuilder()
                    .setColor(0xffff00)
                    .setTitle('⚠️ Suspicious Nickname Change')
                    .setDescription(`${member.user.tag} (${member.user.id}) changed nickname to **${newNick}**`)
                    .addFields(
                      { name: 'Old Nickname', value: oldNick || '[none]', inline: true },
                      { name: 'New Nickname', value: newNick, inline: true },
                      { name: 'Reason', value: 'Staff-like name on non-staff member', inline: false }
                    )
                    .setTimestamp()
                  ]
                }).catch(() => {});
              }
            }
          }
        }
      }
    } catch (err) {
      logger.error('presenceUpdate error:', err);
    }
  }
};
