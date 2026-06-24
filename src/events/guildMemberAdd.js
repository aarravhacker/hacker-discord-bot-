const { getGuild } = require('../db/guildRepository');
const { checkAntiRaid, checkAntiBot, ensureBypassRoles } = require('../utils/securityEnforcer');
const { addSecurityLog } = require('../db/securityRepository');
const logger = require('../utils/logger');
const securityEngine = require('../utils/securityEngine');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    if (!member.guild) return;

    try {
      const guildData = await getGuild(member.guild.id);
      await ensureBypassRoles(member.guild, guildData);

      securityEngine.recordAction(member.guild.id, member.user.id, 'join', {
        isBot: member.user.bot,
        accountAge: Date.now() - member.user.createdTimestamp,
        username: member.user.tag
      });

      await addSecurityLog({
        guild_id: member.guild.id,
        user_id: member.user.id,
        action: 'member_join',
        type: 'security',
        details: JSON.stringify({
          isBot: member.user.bot,
          accountAge: Date.now() - member.user.createdTimestamp,
          username: member.user.tag,
          memberCount: member.guild.memberCount
        })
      });

      if (member.user.bot) {
        const botResult = await checkAntiBot(member, guildData);
        if (botResult) {
          logger.info(`[Anti-Bot] ${botResult.user} ${botResult.action}`);
        }
        return;
      }

      // Account age checking
      const accountAge = Date.now() - member.user.createdTimestamp;
      const oneDay = 86400000;
      const sevenDays = 7 * oneDay;
      const logChannel = guildData.log_channel ? member.guild.channels.cache.get(guildData.log_channel) : null;

      if (accountAge < oneDay) {
        if (logChannel) {
          logChannel.send({ embeds: [new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🚨 New Account Blocked')
            .setDescription(`${member.user.tag} (<@${member.user.id}>) account is less than 24 hours old`)
            .addFields({ name: 'Account Age', value: `${Math.floor(accountAge / 3600000)}h ${Math.floor((accountAge % 3600000) / 60000)}m` })
            .setTimestamp()] }).catch(() => {});
        }
        try { await member.kick('Account less than 24 hours old'); } catch (e) {}
        return;
      }

      if (accountAge < sevenDays) {
        if (logChannel) {
          logChannel.send({ embeds: [new EmbedBuilder()
            .setColor(0xffff00)
            .setTitle('⚠️ Suspicious Account Joined')
            .setDescription(`${member.user.tag} (<@${member.user.id}>) account is less than 7 days old`)
            .setTimestamp()] }).catch(() => {});
        }
      }

      // Anti-raid check
      const result = await checkAntiRaid(member.guild, guildData, member);
      if (result) {
        logger.info(`[Anti-Raid] ${result.user} ${result.action} (${result.joinCount} joins detected)`);

        // Auto-revoke invites during raid
        try {
          const invites = await member.guild.invites.fetch();
          for (const [, invite] of invites) {
            if (invite.uses > 0 && invite.inviter && invite.inviter.id !== member.guild.ownerId) {
              await invite.delete('Anti-raid: mass join detected').catch(() => {});
            }
          }
        } catch (e) {}
      }
    } catch (err) {
      logger.error('guildMemberAdd security check error:', err);
    }
  }
};
