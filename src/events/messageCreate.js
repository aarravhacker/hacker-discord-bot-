const { Collection, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../db/guildRepository');
const logger = require('../utils/logger');
const config = require('../config');
const { aiReply, handleReply } = require('../utils/aiChat');
const { ensureBypassRoles, checkAntiSpam, checkAntiLink, checkAdvancedSpam, checkAdvancedLink, isOwner, isWhitelisted } = require('../utils/securityEnforcer');
const securityEngine = require('../utils/securityEngine');
const { safeJsonParse } = require('../utils/helpers');

const duplicateTracker = new Map();
const messageHistory = new Map();

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const replied = await handleReply(message, message.client);
    if (replied) return;

    const greeted = await aiReply(message);
    if (greeted) return;

    const guildData = await getGuild(message.guild.id);
    await ensureBypassRoles(message.guild, guildData);

    // Blacklist check
    const blacklist = safeJsonParse(guildData.blacklist, []);
    if (blacklist.includes(message.author.id)) return;

    // Global owner bypass
    if (isOwner(message.author.id)) {
      const prefix = guildData.prefix || '!';
      if (!message.content.startsWith(prefix)) return;
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
      const command = message.client.commands.get(commandName) ||
        message.client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
      if (!command) return;

      try {
        logger.info(`[Owner] ${message.author.tag} used ${prefix}${command.data.name} in ${message.guild.name}`);
        await command.execute(message, args);
      } catch (error) {
        logger.error(`Error executing ${command.data.name}:`, error);
        const content = `Error: ${error.message || 'Unknown error'}`;
        message.channel.send({ content }).catch(() => {});
      }
      return;
    }

    // Advanced antispam detection
    await checkAdvancedSpam(message, guildData);

    // Advanced antilink detection
    await checkAdvancedLink(message, guildData);

    // Standard security checks (fallback)
    await checkAntiSpam(message, guildData);
    await checkAntiLink(message, guildData);

    const prefix = guildData.prefix || '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = message.client.commands.get(commandName) ||
      message.client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;

    // Safe access to command data
    const cmdDataName = command.data?.name || command.name || commandName;

    // Owner only check
    if (command.ownerOnly) {
      const noPerm = await message.reply({ content: '❌ This command is restricted to the bot owner.' });
      setTimeout(() => noPerm.delete().catch(() => {}), 5000);
      return;
    }

    // Admin only check
    if (command.adminOnly) {
      const member = message.member;
      if (!member || !member.permissions.has('Administrator')) {
        const noPerm = await message.reply({ content: '❌ This command requires **Administrator** permission.' });
        setTimeout(() => noPerm.delete().catch(() => {}), 5000);
        return;
      }
    }

    // Moderator only check
    if (command.modOnly) {
      const member = message.member;
      const modPerms = ['ManageMessages', 'KickMembers', 'BanMembers', 'ManageGuild'];
      const hasModPerms = member && member.permissions.some(p => modPerms.includes(p));
      if (!hasModPerms && message.author.id !== config.ownerId) {
        const noPerm = await message.reply({ content: '❌ This command requires moderator permissions.' });
        setTimeout(() => noPerm.delete().catch(() => {}), 5000);
        return;
      }
    }

    // Staff only check
    if (command.staffOnly) {
      const member = message.member;
      const staffRoleId = guildData.role_staff;
      const isStaff = staffRoleId && member?.roles.cache.has(staffRoleId);
      const hasStaffPerms = member && (member.permissions.has('Administrator') || member.permissions.has('ManageGuild'));
      if (!isStaff && !hasStaffPerms && message.author.id !== config.ownerId) {
        const noPerm = await message.reply({ content: '❌ This command is restricted to staff members.' });
        setTimeout(() => noPerm.delete().catch(() => {}), 5000);
        return;
      }
    }

    // Cooldown check
    const { cooldowns } = message.client;

    if (!cooldowns.has(cmdDataName)) {
      cooldowns.set(cmdDataName, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(cmdDataName);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
      const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

      if (now < expirationTime) {
        const expiredTimestamp = Math.round(expirationTime / 1000);
        return message.reply({
          content: `Please wait, you are on a cooldown for \`${cmdDataName}\`. You can use it again <t:${expiredTimestamp}:R>.`
        }).then(msg => {
          setTimeout(() => msg.delete().catch(() => {}), 5000);
        });
      }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    try {
      logger.info(`${message.author.tag} used ${prefix}${cmdDataName} in ${message.guild.name}`);
      await command.execute(message, args);
    } catch (error) {
      logger.error(`Error executing ${cmdDataName}:`, error);
      const content = `Error: ${error.message || 'Unknown error'}`;
      message.channel.send({ content }).catch(() => {});
    }
  }
};

async function advancedSpamDetection(message, guildData) {
  try {
    const antispamConfig = safeJsonParse(guildData.antispam_config, {});
    if (!antispamConfig.patterns) return;

    const patterns = antispamConfig.patterns;
    const content = message.content;
    const userId = message.author.id;
    const guildId = message.guild.id;
    const logChannel = guildData.log_channel ? message.guild.channels.cache.get(guildData.log_channel) : null;

    // Store message in history for duplicate detection
    const historyKey = `${guildId}:${userId}`;
    if (!messageHistory.has(historyKey)) messageHistory.set(historyKey, []);
    const history = messageHistory.get(historyKey);
    history.push({ content, timestamp: Date.now(), userId, channelId: message.channel.id });
    if (history.length > 50) history.shift();

    // 1. Duplicate message detection
    if (patterns.duplicateCount) {
      const duplicates = securityEngine.detectDuplicateMessages(history, (patterns.duplicateWindow || 10) * 1000);
      if (duplicates.length > 0 && duplicates[0].count >= patterns.duplicateCount) {
        await handleSpamAction(message, guildData, 'duplicate', `Duplicate message (${duplicates[0].count}x)`, logChannel);
        return;
      }
    }

    // 2. Flood detection
    if (patterns.floodCount) {
      const floodKey = `flood:${guildId}:${userId}`;
      if (!duplicateTracker.has(floodKey)) duplicateTracker.set(floodKey, []);
      const floodTimestamps = duplicateTracker.get(floodKey);
      floodTimestamps.push(Date.now());
      const recent = floodTimestamps.filter(t => Date.now() - t < (patterns.floodWindow || 5) * 1000);
      duplicateTracker.set(floodKey, recent);

      if (recent.length >= patterns.floodCount) {
        duplicateTracker.set(floodKey, []);
        await handleSpamAction(message, guildData, 'flood', `Message flood (${recent.length} msgs in ${patterns.floodWindow || 5}s)`, logChannel);
        return;
      }
    }

    // 3. Emoji spam detection
    if (patterns.emojiCount) {
      const emojiResult = securityEngine.detectEmojiSpam(content, patterns.emojiCount, antispamConfig.emoji || {});
      if (emojiResult.triggered) {
        await handleSpamAction(message, guildData, 'emoji', `Emoji spam (${emojiResult.count} emojis)`, logChannel);
        return;
      }
    }

    // 4. Caps lock detection
    if (patterns.capsPercent) {
      const capsResult = securityEngine.detectCapsSpam(content, patterns.capsPercent, patterns.capsMinLength || 20);
      if (capsResult.triggered) {
        await handleSpamAction(message, guildData, 'caps', `Caps lock (${capsResult.percent}%)`, logChannel);
        return;
      }
    }

    // 5. Word spam detection
    if (antispamConfig.words?.blacklist?.length > 0) {
      const wordResult = securityEngine.detectWordSpam(content, antispamConfig.words.blacklist);
      if (wordResult.triggered) {
        const words = wordResult.matches.map(m => m.word).join(', ');
        await handleSpamAction(message, guildData, 'word', `Blacklisted words: ${words}`, logChannel);
        return;
      }
    }

    // 6. Mention spam detection
    if (patterns.mentionCount) {
      const mentionResult = securityEngine.detectMentionSpam(content, patterns.mentionCount);
      if (mentionResult.triggered) {
        await handleSpamAction(message, guildData, 'mention', `Mass mentions (${mentionResult.count})`, logChannel);
        return;
      }
    }

    // 7. Link spam detection
    if (patterns.linkCount) {
      const linkResult = securityEngine.detectLinkSpam(content, patterns.linkCount);
      if (linkResult.triggered) {
        await handleSpamAction(message, guildData, 'link', `Link spam (${linkResult.count} links)`, logChannel);
        return;
      }
    }

  } catch (error) {
    logger.error('Advanced spam detection error:', error);
  }
}

async function handleSpamAction(message, guildData, type, reason, logChannel) {
  try {
    await message.delete().catch(() => {});

    const antispamConfig = safeJsonParse(guildData.antispam_config, {});
    let action = antispamConfig.action || 'mute';
    const duration = antispamConfig.duration || 5;
    const targetMember = await message.guild.members.fetch(message.author.id).catch(() => null);

    if (logChannel) {
      logChannel.send({
        embeds: [new EmbedBuilder()
          .setColor(0xff6600)
          .setTitle(`🚨 Anti-Spam - ${type.toUpperCase()}`)
          .setDescription(`${message.author.tag} (${message.author.id}) triggered ${type} detection`)
          .addFields({ name: 'Reason', value: reason })
          .setTimestamp()
        ]
      }).catch(() => {});
    }

    if (!targetMember) return;

    switch (action) {
      case 'warn':
        await message.channel.send({ content: `⚠️ ${message.author}, ${reason}!` }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        break;
      case 'mute': {
        let mutedRole = message.guild.roles.cache.find(r => r.name === 'Muted');
        if (!mutedRole) {
          mutedRole = await message.guild.roles.create({ name: 'Muted', color: '#888888', permissions: [] });
          message.guild.channels.cache.forEach(ch => {
            ch.permissionOverwrites.edit(mutedRole, { SendMessages: false }).catch(() => {});
          });
        }
        await targetMember.roles.add(mutedRole);
        setTimeout(async () => {
          if (targetMember.roles.cache.has(mutedRole.id)) {
            await targetMember.roles.remove(mutedRole).catch(() => {});
          }
        }, duration * 60 * 1000);
        break;
      }
      case 'kick':
        await targetMember.kick(`Anti-spam: ${reason}`);
        break;
      case 'ban':
        await targetMember.ban({ reason: `Anti-spam: ${reason}` });
        break;
      case 'timeout':
        await targetMember.timeout(duration * 60 * 1000, `Anti-spam: ${reason}`);
        break;
    }

    securityEngine.recordSpamEvent(message.guild.id, message.author.id, type, { reason, action, timestamp: Date.now() });

  } catch (error) {
    logger.error('handleSpamAction error:', error);
  }
}
