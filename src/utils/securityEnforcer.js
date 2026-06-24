const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../db/guildRepository');
const logger = require('./logger');
const securityEngine = require('./securityEngine');
const { safeJsonParse } = require('./helpers');

const raidTracker = new Map();
const channelCreateTracker = new Map();
const spamTracker = new Map();
const linkCooldownTracker = new Map();
const mentionTracker = new Map();
const duplicateTracker = new Map();

function isOwner(userId) {
  return userId === process.env.OWNER_ID;
}

function isWhitelisted(userId, guildData) {
  const wl = safeJsonParse(guildData.whitelist, []);
  return wl.includes(userId);
}

function requires2FA(guild, member) {
  return guild.mfaLevel === 1 && !member.permissions.has(PermissionFlagsBits.Administrator);
}

function hasBypassRole(member, bypassRoleId) {
  if (!bypassRoleId || !member) return false;
  return member.roles.cache.has(bypassRoleId);
}

async function ensureBypassRoles(guild, guildData) {
  const rolesToCreate = [
    { key: 'antinuke_bypass_role', name: 'Security Bypass - Anti-Nuke', color: '#ff4444' },
    { key: 'antiraid_bypass_role', name: 'Security Bypass - Anti-Raid', color: '#ff8800' },
    { key: 'antispam_bypass_role', name: 'Security Bypass - Anti-Spam', color: '#ffaa00' },
    { key: 'antilink_bypass_role', name: 'Security Bypass - Anti-Link', color: '#00ccff' },
    { key: 'antibot_bypass_role', name: 'Security Bypass - Anti-Bot', color: '#cc00ff' }
  ];

  for (const r of rolesToCreate) {
    const storedId = guildData[r.key];

    // Check if stored role still exists in the guild
    if (storedId) {
      const cachedRole = guild.roles.cache.get(storedId);
      if (cachedRole) continue; // Role exists, skip

      // Role ID in DB but role doesn't exist in guild — check by name
      const byName = guild.roles.cache.find(role => role.name === r.name);
      if (byName) {
        await updateGuild(guild.id, { [r.key]: byName.id });
        guildData[r.key] = byName.id;
        continue;
      }

      // Stored ID is stale, clear it
      await updateGuild(guild.id, { [r.key]: null });
      guildData[r.key] = null;
    }

    // No valid role — check by name first
    const existingByName = guild.roles.cache.find(role => role.name === r.name);
    if (existingByName) {
      await updateGuild(guild.id, { [r.key]: existingByName.id });
      guildData[r.key] = existingByName.id;
      continue;
    }

    // Create new role only if none exists
    try {
      const newRole = await guild.roles.create({
        name: r.name,
        color: r.color,
        permissions: [],
        reason: 'Auto-created security bypass role'
      });
      await updateGuild(guild.id, { [r.key]: newRole.id });
      guildData[r.key] = newRole.id;
    } catch (err) {
      logger.error(`Failed to create bypass role ${r.name}:`, err);
    }
  }
  return guildData;
}

const nukeActionTracker = new Map();

async function checkAntiNukeThreshold(guild, guildData, executorId, actionType) {
  if (isOwner(executorId)) return 'allow';
  if (!guildData.antinuke_enabled) return 'allow';

  const wl = safeJsonParse(guildData.whitelist, []);
  if (wl.includes(executorId)) return 'allow';

  const owners = safeJsonParse(guildData.antinuke_owners, []);
  if (owners.includes(executorId)) return 'allow';

  const bypassRole = guildData.antinuke_bypass_role;
  const member = await guild.members.fetch(executorId).catch(() => null);
  if (member && hasBypassRole(member, bypassRole)) return 'allow';

  const anConfig = safeJsonParse(guildData.antinuke_config, {});
  const thresholds = {
    channel: anConfig.maxChannelDelete || anConfig.channel || 3,
    role: anConfig.maxRoleDelete || anConfig.role || 3,
    member: anConfig.maxMemberBan || anConfig.member || 3,
    guild: anConfig.maxGuildUpdate || anConfig.guild || 1
  };
  const timeWindow = anConfig.timeWindow || 60000;

  const key = `antinuke:${guild.id}:${executorId}:${actionType}`;
  const now = Date.now();

  if (!nukeActionTracker.has(key)) nukeActionTracker.set(key, []);
  const history = nukeActionTracker.get(key);
  history.push(now);
  const recent = history.filter(t => now - t < timeWindow);
  nukeActionTracker.set(key, recent);

  if (recent.length >= (thresholds[actionType] || 3)) {
    nukeActionTracker.set(key, []);
    return 'punish';
  }
  return 'monitor';
}

async function punishNukeAction(guild, guildData, executorId, reason) {
  const punishment = guildData.antinuke_punishment || 'kick';
  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return null;

  try {
    switch (punishment) {
      case 'ban':
        await member.ban({ reason });
        break;
      case 'kick':
        await member.kick(reason);
        break;
      case 'timeout':
        const dur = (guildData.antinuke_timeout_duration || 10) * 60 * 1000;
        await member.timeout(dur, reason);
        break;
      case 'strip':
        const adminRoles = member.roles.cache.filter(r => r.permissions.has(PermissionFlagsBits.Administrator));
        await member.roles.remove(adminRoles, reason);
        break;
    }
    return { action: punishment, user: member.user.tag };
  } catch (err) {
    logger.error(`Anti-nuke ${punishment} failed:`, err);
    return null;
  }
}

async function checkAntiNukeChannelDelete(guild, guildData, executorId, channelName) {
  const member = await guild.members.fetch(executorId).catch(() => null);
  if (member && requires2FA(guild, member)) {
    logger.warn(`[2FA] Channel delete blocked: ${member.user.tag} lacks 2FA`);
    return { action: 'blocked_2fa', user: member.user.tag };
  }

  const decision = await checkAntiNukeThreshold(guild, guildData, executorId, 'channel');
  if (decision === 'allow') return null;

  if (decision === 'punish') {
    const result = await punishNukeAction(guild, guildData, executorId, 'Anti-Nuke: Channel deletion threshold exceeded');
    const logCh = guildData.log_channel ? guild.channels.cache.get(guildData.log_channel) : null;
    if (logCh && result) {
      logCh.send({ embeds: [
        new EmbedBuilder().setColor(0xff0000).setTitle('🔨 Anti-Nuke Triggered')
          .setDescription(`${result.user} (${executorId}) — **${result.action}** for deleting channel **#${channelName}**`)
          .setTimestamp()
      ] }).catch(() => {});
    }
    return result;
  }
  return null;
}

async function checkAntiNukeChannelCreate(guild, guildData, executorId, channelName) {
  const decision = await checkAntiNukeThreshold(guild, guildData, executorId, 'channel');
  if (decision === 'allow') return null;

  if (decision === 'punish') {
    const result = await punishNukeAction(guild, guildData, executorId, 'Anti-Nuke: Channel creation threshold exceeded');
    const logCh = guildData.log_channel ? guild.channels.cache.get(guildData.log_channel) : null;
    if (logCh && result) {
      logCh.send({ embeds: [
        new EmbedBuilder().setColor(0xff0000).setTitle('🔨 Anti-Nuke Triggered')
          .setDescription(`${result.user} (${executorId}) — **${result.action}** for creating channel **#${channelName}**`)
          .setTimestamp()
      ] }).catch(() => {});
    }
    return result;
  }
  return null;
}

async function checkAntiNukeRoleDelete(guild, guildData, executorId, roleName) {
  const member = await guild.members.fetch(executorId).catch(() => null);
  if (member && requires2FA(guild, member)) {
    logger.warn(`[2FA] Role delete blocked: ${member.user.tag} lacks 2FA`);
    return { action: 'blocked_2fa', user: member.user.tag };
  }

  const decision = await checkAntiNukeThreshold(guild, guildData, executorId, 'role');
  if (decision === 'allow') return null;

  if (decision === 'punish') {
    const result = await punishNukeAction(guild, guildData, executorId, 'Anti-Nuke: Role deletion threshold exceeded');
    const logCh = guildData.log_channel ? guild.channels.cache.get(guildData.log_channel) : null;
    if (logCh && result) {
      logCh.send({ embeds: [
        new EmbedBuilder().setColor(0xff0000).setTitle('🔨 Anti-Nuke Triggered')
          .setDescription(`${result.user} (${executorId}) — **${result.action}** for deleting role **@${roleName}**`)
          .setTimestamp()
      ] }).catch(() => {});
    }
    return result;
  }
  return null;
}

async function checkAntiNukeRoleCreate(guild, guildData, executorId, roleName) {
  const decision = await checkAntiNukeThreshold(guild, guildData, executorId, 'role');
  if (decision === 'allow') return null;

  if (decision === 'punish') {
    const result = await punishNukeAction(guild, guildData, executorId, 'Anti-Nuke: Role creation threshold exceeded');
    const logCh = guildData.log_channel ? guild.channels.cache.get(guildData.log_channel) : null;
    if (logCh && result) {
      logCh.send({ embeds: [
        new EmbedBuilder().setColor(0xff0000).setTitle('🔨 Anti-Nuke Triggered')
          .setDescription(`${result.user} (${executorId}) — **${result.action}** for creating role **@${roleName}**`)
          .setTimestamp()
      ] }).catch(() => {});
    }
    return result;
  }
  return null;
}

const nukeCountTracker = new Map();

async function checkAntiNukeMassBan(guild, guildData, executorId, targetIds) {
  if (isOwner(executorId)) return null;
  if (!guildData.antinuke_enabled) return null;

  const owners = safeJsonParse(guildData.antinuke_owners, []);
  if (owners.includes(executorId)) return null;

  const wl = safeJsonParse(guildData.whitelist, []);
  if (wl.includes(executorId)) return null;

  const bypassRole = guildData.antinuke_bypass_role;
  const member = await guild.members.fetch(executorId).catch(() => null);
  if (member && hasBypassRole(member, bypassRole)) return null;

  if (member && requires2FA(guild, member)) {
    logger.warn(`[2FA] Mass ban blocked: ${member.user.tag} lacks 2FA`);
    return { action: 'blocked_2fa', user: member.user.tag };
  }

  const anConfig = safeJsonParse(guildData.antinuke_config, {});
  const maxBan = anConfig.maxMemberBan || 3;
  const timeWindow = anConfig.timeWindow || 60000;

  const key = `ban:${guild.id}:${executorId}`;
  const now = Date.now();

  if (!nukeCountTracker.has(key)) nukeCountTracker.set(key, []);
  const history = nukeCountTracker.get(key);
  history.push({ time: now, count: targetIds.length });
  const recent = history.filter(h => now - h.time < timeWindow);
  nukeCountTracker.set(key, recent);
  const totalBanned = recent.reduce((sum, h) => sum + h.count, 0);

  if (totalBanned >= maxBan) {
    nukeCountTracker.set(key, []);
    const result = await punishNukeAction(guild, guildData, executorId, 'Anti-Nuke: Mass ban detected');
    return result;
  }
  return null;
}

async function checkAntiNukeMassKick(guild, guildData, executorId, targetIds) {
  if (isOwner(executorId)) return null;
  if (!guildData.antinuke_enabled) return null;

  const owners = safeJsonParse(guildData.antinuke_owners, []);
  if (owners.includes(executorId)) return null;

  const wl = safeJsonParse(guildData.whitelist, []);
  if (wl.includes(executorId)) return null;

  const bypassRole = guildData.antinuke_bypass_role;
  const member = await guild.members.fetch(executorId).catch(() => null);
  if (member && hasBypassRole(member, bypassRole)) return null;

  if (member && requires2FA(guild, member)) {
    logger.warn(`[2FA] Mass kick blocked: ${member.user.tag} lacks 2FA`);
    return { action: 'blocked_2fa', user: member.user.tag };
  }

  const anConfig = safeJsonParse(guildData.antinuke_config, {});
  const maxKick = anConfig.maxMemberKick || 3;
  const timeWindow = anConfig.timeWindow || 60000;

  const key = `kick:${guild.id}:${executorId}`;
  const now = Date.now();

  if (!nukeCountTracker.has(key)) nukeCountTracker.set(key, []);
  const history = nukeCountTracker.get(key);
  history.push({ time: now, count: targetIds.length });
  const recent = history.filter(h => now - h.time < timeWindow);
  nukeCountTracker.set(key, recent);
  const totalKicked = recent.reduce((sum, h) => sum + h.count, 0);

  if (totalKicked >= maxKick) {
    nukeCountTracker.set(key, []);
    const result = await punishNukeAction(guild, guildData, executorId, 'Anti-Nuke: Mass kick detected');
    return result;
  }
  return null;
}

async function checkAntiNukeGuildUpdate(guild, guildData, executorId, changes) {
  const decision = await checkAntiNukeThreshold(guild, guildData, executorId, 'guild');
  if (decision === 'allow') return null;

  if (decision === 'punish') {
    const result = await punishNukeAction(guild, guildData, executorId, 'Anti-Nuke: Server settings change threshold exceeded');
    const logCh = guildData.log_channel ? guild.channels.cache.get(guildData.log_channel) : null;
    if (logCh && result) {
      logCh.send({ embeds: [
        new EmbedBuilder().setColor(0xff0000).setTitle('Anti-Nuke Triggered')
          .setDescription(`${result.user} (${executorId}) — ${result.action} for changing server settings: ${changes.join(', ')}`)
          .setTimestamp()
      ] }).catch(() => {});
    }
    return result;
  }
  return null;
}

async function checkAntiNukeRoleUpdate(guild, guildData, executorId, roleName, changeDesc) {
  const decision = await checkAntiNukeThreshold(guild, guildData, executorId, 'role');
  if (decision === 'allow') return null;

  if (decision === 'punish') {
    const result = await punishNukeAction(guild, guildData, executorId, 'Anti-Nuke: Role modification threshold exceeded');
    const logCh = guildData.log_channel ? guild.channels.cache.get(guildData.log_channel) : null;
    if (logCh && result) {
      logCh.send({ embeds: [
        new EmbedBuilder().setColor(0xff0000).setTitle('Anti-Nuke Triggered')
          .setDescription(`${result.user} (${executorId}) — ${result.action} for ${changeDesc} on role @${roleName}`)
          .setTimestamp()
      ] }).catch(() => {});
    }
    return result;
  }
  return null;
}

async function checkAntiRaid(guild, guildData, member) {
  if (isOwner(member.user.id)) return null;
  if (!guildData.antiraid_enabled) return null;

  const wl = safeJsonParse(guildData.whitelist, []);
  if (wl.includes(member.user.id)) return null;

  const bypassRole = guildData.antiraid_bypass_role;
  if (hasBypassRole(member, bypassRole)) return null;

  const arConfig = safeJsonParse(guildData.antiraid_config, {});
  const threshold = arConfig.joinThreshold || 5;
  const timeWindow = (arConfig.timeWindow || 10) * 1000;
  const action = arConfig.action || 'kick';

  const key = `raid:${guild.id}`;
  const now = Date.now();

  if (!raidTracker.has(key)) raidTracker.set(key, []);
  const joins = raidTracker.get(key);
  joins.push(now);
  const recent = joins.filter(t => now - t < timeWindow);
  raidTracker.set(key, recent);

  if (recent.length >= threshold) {
    raidTracker.set(key, []);
    try {
      switch (action) {
        case 'kick':
          await member.kick('Anti-Raid: Join raid detected');
          break;
        case 'ban':
          await member.ban({ reason: 'Anti-Raid: Join raid detected' });
          break;
        case 'timeout':
          await member.timeout(30 * 60 * 1000, 'Anti-Raid: Join raid detected');
          break;
      }
      const logCh = guildData.log_channel ? guild.channels.cache.get(guildData.log_channel) : null;
      if (logCh) {
        logCh.send({ embeds: [
          new EmbedBuilder().setColor(0xff3300).setTitle('🚨 Anti-Raid Triggered')
            .setDescription(`${member.user.tag} (${member.user.id}) — **${action}**\n${recent.length} joins in ${timeWindow / 1000}s`)
            .setTimestamp()
        ] }).catch(() => {});
      }
      return { action, user: member.user.tag, joinCount: recent.length };
    } catch (err) {
      logger.error('Anti-raid action failed:', err);
    }
  }
  return null;
}

const spamViolations = new Map();

async function checkAntiSpam(message, guildData) {
  if (!guildData.antispam_enabled) return null;

  const isOwn = isOwner(message.author.id);
  if (isOwn) return null;

  const wl = safeJsonParse(guildData.whitelist, []);
  if (wl.includes(message.author.id)) return null;

  const antispamConfig = safeJsonParse(guildData.antispam_config, {});
  const msgLimit = antispamConfig.messageLimit || 5;
  const timeWindow = antispamConfig.timeWindow || 5000;
  let action = antispamConfig.action || 'mute';
  const duration = antispamConfig.duration || 5;
  const punishLevel = antispamConfig.punishLevel || 'none';
  const ignoredChannels = antispamConfig.ignoredChannels || [];
  const ignoredRoles = antispamConfig.ignoredRoles || [];
  const bypassRoles = antispamConfig.bypassRoles || [];

  if (ignoredChannels.includes(message.channel.id)) return null;

  const member = message.member;
  if (member && member.roles.cache.some(r => ignoredRoles.includes(r.id))) return null;

  const bypassRole = guildData.antispam_bypass_role;
  if (member && hasBypassRole(member, bypassRole)) return null;

  if (member && member.roles.cache.some(r => bypassRoles.includes(r.id))) return null;

  const key = `spam:${message.guild.id}:${message.author.id}`;
  const now = Date.now();

  if (!spamTracker.has(key)) spamTracker.set(key, []);
  const timestamps = spamTracker.get(key);
  timestamps.push(now);
  const recent = timestamps.filter(t => now - t < timeWindow);
  spamTracker.set(key, recent);

  if (recent.length >= msgLimit) {
    spamTracker.set(key, []);

    if (punishLevel === 'escalate') {
      const vKey = `spam_violations:${message.guild.id}:${message.author.id}`;
      const violations = (spamViolations.get(vKey) || 0) + 1;
      spamViolations.set(vKey, violations);
      const escalateActions = ['warn', 'mute', 'kick', 'ban'];
      const idx = Math.min(violations - 1, escalateActions.length - 1);
      action = escalateActions[idx];
    }

    const targetMember = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!targetMember) return null;

    const logChannel = guildData.log_channel ? message.guild.channels.cache.get(guildData.log_channel) : null;

    try {
      switch (action) {
        case 'warn':
          await message.reply({ content: '⚠️ Please stop spamming!' }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
          if (logChannel) {
            logChannel.send({ embeds: [new EmbedBuilder().setColor(0xffff00).setDescription(`⚠️ ${message.author.tag} warned (spam)`)] }).catch(() => {});
          }
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
          if (logChannel) {
            logChannel.send({ embeds: [new EmbedBuilder().setColor(0xffaa00).setDescription(`🔇 ${targetMember} muted for ${duration}m (spam)`)] }).catch(() => {});
          }
          break;
        }
        case 'kick':
          await targetMember.kick('Anti-spam: excessive message flooding');
          if (logChannel) {
            logChannel.send({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`👢 ${message.author.tag} kicked (spam)`)] }).catch(() => {});
          }
          break;
        case 'ban':
          await targetMember.ban({ reason: 'Anti-spam: excessive message flooding' });
          if (logChannel) {
            logChannel.send({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`🔨 ${message.author.tag} banned (spam)`)] }).catch(() => {});
          }
          break;
        case 'timeout':
          await targetMember.timeout(duration * 60 * 1000, 'Anti-spam: excessive message flooding');
          if (logChannel) {
            logChannel.send({ embeds: [new EmbedBuilder().setColor(0xff6600).setDescription(`⏰ ${targetMember} timed out ${duration}m (spam)`)] }).catch(() => {});
          }
          break;
      }
      return { action, user: message.author.tag };
    } catch (err) {
      logger.error('Anti-spam action failed:', err);
    }
  }
  return null;
}

async function checkAntiLink(message, guildData) {
  if (!guildData.antilink_enabled) return null;

  const isOwn = isOwner(message.author.id);
  if (isOwn) return null;

  const wl = safeJsonParse(guildData.whitelist, []);
  if (wl.includes(message.author.id)) return null;

  const antilinkConfig = safeJsonParse(guildData.antilink_config, {});
  const action = antilinkConfig.action || 'delete';
  const blockInvites = antilinkConfig.blockInvites !== undefined ? antilinkConfig.blockInvites : true;
  const blockUrls = antilinkConfig.blockUrls !== undefined ? antilinkConfig.blockUrls : true;
  const duration = antilinkConfig.duration || 5;
  const whitelistedDomains = antilinkConfig.whitelistedDomains || [];
  const ignoredChannels = antilinkConfig.ignoredChannels || [];
  const ignoredRoles = antilinkConfig.ignoredRoles || [];

  const member = message.member;
  if (!member) return null;

  if (ignoredChannels.includes(message.channel.id)) return null;

  if (member.roles.cache.some(r => ignoredRoles.includes(r.id))) return null;

  const bypassRole = guildData.antilink_bypass_role;
  if (hasBypassRole(member, bypassRole)) return null;

  // Anti-link cooldown (prevent rapid-fire link deletions)
  const linkCooldownKey = `link_cooldown:${message.guild.id}:${message.author.id}`;
  const linkCooldownNow = Date.now();
  if (linkCooldownTracker.has(linkCooldownKey)) {
    const lastAction = linkCooldownTracker.get(linkCooldownKey);
    if (linkCooldownNow - lastAction < 2000) return null; // 2 second cooldown
  }

  const content = message.content.toLowerCase();
  const originalContent = message.content;
  let hasLink = false;
  let linkType = '';

  // Block Discord invites (all formats)
  if (blockInvites) {
    const inviteRegex = /(discord\.(gg|io|me|li)\/|discordapp\.com\/invite\/|discord\.com\/invite\/)[a-zA-Z0-9]+/gi;
    if (inviteRegex.test(originalContent)) {
      hasLink = true;
      linkType = 'invite';
    }
  }

  // Block URLs with improved detection
  if (blockUrls && !hasLink) {
    // Standard URLs
    const urlRegex = /https?:\/\/[^\s]+/gi;
    // bare domain detection (e.g., google.com without http)
    const bareDomainRegex = /(?:www\.)?[a-zA-Z0-9-]+\.(com|net|org|io|me|gg|co|dev|app|xyz|tk|ml|ga|cf|gq|link|url|top|club|online|site|tech|fun|icu|buzz|monster|hair|loan|racing|download|review|stream|accountant|science|party|gdn|work|men|cam|lol|rip|fyi|sbs|sh|fun|lol|dev|art|bio|link|page|mom|one|top|cam|sex|porn|xxx|nsfw)[\/\s]/gi;
    
    const urls = originalContent.match(urlRegex) || [];
    const bareDomains = originalContent.match(bareDomainRegex) || [];
    const allLinks = [...urls, ...bareDomains];
    
    let blocked = false;
    for (const url of allLinks) {
      const domain = url.replace(/https?:\/\//, '').replace(/\/.*$/, '').split('/')[0].toLowerCase().replace(/^www\./, '');
      const isWhitelisted = whitelistedDomains.some(d => domain.includes(d.toLowerCase()));
      if (!isWhitelisted) {
        blocked = true;
        break;
      }
    }
    if (blocked) {
      hasLink = true;
      linkType = linkType || 'url';
    }
  }

  // Block phishing patterns
  const phishingPatterns = [
    /discord\.(gg|com)\/(nitro|free|gift|airdrop)/gi,
    /steamcommunity\.com\/(id|profiles)\/[a-z]+\/tradeoffer/gi,
    /(?:free|cheap|buy|sell)\s*(nitro|discord|boost)/gi,
    /@everyone.*(?:free|nitro|gift|claim)/gi,
    /(?:token|grab|steal|ip|dox)/gi
  ];

  for (const pattern of phishingPatterns) {
    if (pattern.test(originalContent)) {
      hasLink = true;
      linkType = linkType || 'phishing';
      break;
    }
  }

  if (!hasLink) return null;

  linkCooldownTracker.set(linkCooldownKey, linkCooldownNow);

  try {
    await message.delete().catch(() => {});

    const logChannel = guildData.log_channel ? message.guild.channels.cache.get(guildData.log_channel) : null;
    const targetMember = await message.guild.members.fetch(message.author.id).catch(() => null);

    switch (action) {
      case 'delete':
        if (logChannel) {
          logChannel.send({
            embeds: [new EmbedBuilder()
              .setColor(0xff6600)
              .setTitle(`🔗 Link Blocked - Antilink (${linkType})`)
              .setDescription(`${message.author.tag} (${message.author.id}) posted a blocked ${linkType} in <#${message.channel.id}>`)
              .addFields({ name: 'Content', value: originalContent.length > 1024 ? originalContent.substring(0, 1021) + '...' : originalContent })
              .setTimestamp()
            ]
          }).catch(() => {});
        }
        break;

      case 'warn':
        await message.channel.send({ content: `⚠️ ${message.author}, posting links is not allowed!` }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        if (logChannel) {
          logChannel.send({
            embeds: [new EmbedBuilder()
              .setColor(0xffff00)
              .setTitle('⚠️ Link Warned - Antilink')
              .setDescription(`${message.author.tag} (${message.author.id}) warned for posting ${linkType}`)
              .setTimestamp()
            ]
          }).catch(() => {});
        }
        break;

      case 'mute': {
        let mutedRole = message.guild.roles.cache.find(r => r.name === 'Muted');
        if (!mutedRole) {
          mutedRole = await message.guild.roles.create({ name: 'Muted', color: '#888888', permissions: [] });
          message.guild.channels.cache.forEach(ch => {
            ch.permissionOverwrites.edit(mutedRole, { SendMessages: false }).catch(() => {});
          });
        }
        if (targetMember) {
          await targetMember.roles.add(mutedRole);
          setTimeout(async () => {
            if (targetMember.roles.cache.has(mutedRole.id)) {
              await targetMember.roles.remove(mutedRole).catch(() => {});
            }
          }, duration * 60 * 1000);
        }
        if (logChannel) {
          logChannel.send({
            embeds: [new EmbedBuilder()
              .setColor(0xffaa00)
              .setDescription(`🔇 ${message.author.tag} muted for ${duration}m (antilink: ${linkType})`)
            ]
          }).catch(() => {});
        }
        break;
      }

      case 'kick':
        if (targetMember) {
          await targetMember.kick(`Antilink: Posted blocked ${linkType}`);
          if (logChannel) {
            logChannel.send({
              embeds: [new EmbedBuilder()
                .setColor(0xff4444)
                .setDescription(`👢 ${message.author.tag} kicked (antilink: ${linkType})`)
              ]
            }).catch(() => {});
          }
        }
        break;

      case 'ban':
        if (targetMember) {
          await targetMember.ban({ reason: `Antilink: Posted blocked ${linkType}` });
          if (logChannel) {
            logChannel.send({
              embeds: [new EmbedBuilder()
                .setColor(0xff0000)
                .setDescription(`🔨 ${message.author.tag} banned (antilink: ${linkType})`)
              ]
            }).catch(() => {});
          }
        }
        break;

      case 'timeout':
        if (targetMember) {
          await targetMember.timeout(duration * 60 * 1000, `Antilink: Posted blocked ${linkType}`);
          if (logChannel) {
            logChannel.send({
              embeds: [new EmbedBuilder()
                .setColor(0xff6600)
                .setDescription(`⏰ ${message.author.tag} timed out ${duration}m (antilink: ${linkType})`)
              ]
            }).catch(() => {});
          }
        }
        break;
    }

    return { action, user: message.author.tag, linkType };
  } catch (err) {
    logger.error('Antilink action failed:', err);
  }
  return null;
}

async function checkAntiBot(member, guildData) {
  if (!guildData.antibot_enabled) return null;
  if (!member.user.bot) return null;

  const isOwn = isOwner(member.user.id);
  if (isOwn) return null;

  const wl = safeJsonParse(guildData.whitelist, []);
  if (wl.includes(member.user.id)) return null;

  const bypassRole = guildData.antibot_bypass_role;
  if (hasBypassRole(member, bypassRole)) return null;

  const antibotConfig = JSON.parse(guildData.antibot_config || '{}');
  const action = antibotConfig.action || 'kick';

  try {
    switch (action) {
      case 'kick':
        await member.kick('Anti-Bot: Bot account detected');
        break;
      case 'ban':
        await member.ban({ reason: 'Anti-Bot: Bot account detected' });
        break;
    }

    const logCh = guildData.log_channel ? member.guild.channels.cache.get(guildData.log_channel) : null;
    if (logCh) {
      logCh.send({
        embeds: [new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle('🤖 Bot Blocked - AntiBot')
          .setDescription(`${member.user.tag} (${member.user.id}) — **${action}**`)
          .setTimestamp()
        ]
      }).catch(() => {});
    }

    console.log(`[Anti-Bot] ${member.user.tag} ${action} (bot detected)`);
    return { action, user: member.user.tag };
  } catch (err) {
    logger.error('Anti-bot action failed:', err);
  }
  return null;
}

// ==================== ENHANCED ANTISPAM DETECTION ====================

async function checkAdvancedSpam(message, guildData) {
  if (!guildData.antispam_enabled) return null;

  const isOwn = isOwner(message.author.id);
  if (isOwn) return null;

  const wl = safeJsonParse(guildData.whitelist, []);
  if (wl.includes(message.author.id)) return null;

  const member = message.member;
  if (!member) return null;

  const bypassRole = guildData.antispam_bypass_role;
  if (hasBypassRole(member, bypassRole)) return null;

  const antispamConfig = safeJsonParse(guildData.antispam_config, {});
  const ignoredChannels = antispamConfig.ignoredChannels || [];
  const ignoredRoles = antispamConfig.ignoredRoles || [];

  if (ignoredChannels.includes(message.channel.id)) return null;
  if (member.roles.cache.some(r => ignoredRoles.includes(r.id))) return null;

  const patterns = antispamConfig.patterns || {};
  const content = message.content;
  const userId = message.author.id;
  const guildId = message.guild.id;
  const logChannel = guildData.log_channel ? message.guild.channels.cache.get(guildData.log_channel) : null;

  // 1. Duplicate message detection
  if (patterns.duplicateCount) {
    const dupKey = `dup:${guildId}:${userId}`;
    if (!duplicateTracker.has(dupKey)) duplicateTracker.set(dupKey, []);
    const dupHistory = duplicateTracker.get(dupKey);
    const now = Date.now();
    const windowMs = (patterns.duplicateWindow || 10) * 1000;

    dupHistory.push({ content: content.toLowerCase().trim(), timestamp: now });
    const recent = dupHistory.filter(h => now - h.timestamp < windowMs);
    duplicateTracker.set(dupKey, recent.slice(-50));

    const groups = {};
    for (const h of recent) {
      if (!groups[h.content]) groups[h.content] = 0;
      groups[h.content]++;
    }
    for (const [text, count] of Object.entries(groups)) {
      if (count >= patterns.duplicateCount) {
        return await executeSpamAction(message, guildData, 'duplicate', `Duplicate message (${count}x in ${patterns.duplicateWindow || 10}s)`, logChannel);
      }
    }
  }

  // 2. Emoji spam detection
  if (patterns.emojiCount && antispamConfig.emoji) {
    const emojiResult = securityEngine.detectEmojiSpam(content, patterns.emojiCount, antispamConfig.emoji);
    if (emojiResult.triggered) {
      return await executeSpamAction(message, guildData, 'emoji', `Emoji spam (${emojiResult.count} emojis)`, logChannel);
    }
  }

  // 3. Caps lock detection
  if (patterns.capsPercent) {
    const capsResult = securityEngine.detectCapsSpam(content, patterns.capsPercent, patterns.capsMinLength || 20);
    if (capsResult.triggered) {
      return await executeSpamAction(message, guildData, 'caps', `Caps lock (${capsResult.percent}%)`, logChannel);
    }
  }

  // 4. Word spam detection
  if (antispamConfig.words?.blacklist?.length > 0) {
    const wordResult = securityEngine.detectWordSpam(content, antispamConfig.words.blacklist);
    if (wordResult.triggered) {
      const words = wordResult.matches.map(m => m.word).join(', ');
      return await executeSpamAction(message, guildData, 'word', `Blacklisted words: ${words}`, logChannel);
    }
  }

  // 5. Mention spam detection
  if (patterns.mentionCount) {
    const mentionResult = securityEngine.detectMentionSpam(content, patterns.mentionCount);
    if (mentionResult.triggered) {
      return await executeSpamAction(message, guildData, 'mention', `Mass mentions (${mentionResult.count})`, logChannel);
    }
  }

  // 6. Link spam detection
  if (patterns.linkCount) {
    const linkResult = securityEngine.detectLinkSpam(content, patterns.linkCount);
    if (linkResult.triggered) {
      return await executeSpamAction(message, guildData, 'link', `Link spam (${linkResult.count} links)`, logChannel);
    }
  }

  // 7. Flood detection
  if (patterns.floodCount) {
    const floodKey = `flood:${guildId}:${userId}`;
    if (!spamTracker.has(floodKey)) spamTracker.set(floodKey, []);
    const floodTimestamps = spamTracker.get(floodKey);
    const now = Date.now();
    floodTimestamps.push(now);
    const recent = floodTimestamps.filter(t => now - t < (patterns.floodWindow || 5) * 1000);
    spamTracker.set(floodKey, recent);

    if (recent.length >= patterns.floodCount) {
      spamTracker.set(floodKey, []);
      return await executeSpamAction(message, guildData, 'flood', `Message flood (${recent.length} msgs in ${patterns.floodWindow || 5}s)`, logChannel);
    }
  }

  securityEngine.recordSpamEvent(guildId, userId, 'message', { content: content.substring(0, 100) });
  return null;
}

async function executeSpamAction(message, guildData, type, reason, logChannel) {
  try {
    await message.delete().catch(() => {});

    const antispamConfig = safeJsonParse(guildData.antispam_config, {});
    let action = antispamConfig.action || 'mute';
    const duration = antispamConfig.duration || 5;
    const punishLevel = antispamConfig.punishLevel || 'none';
    const targetMember = await message.guild.members.fetch(message.author.id).catch(() => null);

    if (punishLevel === 'escalate') {
      const vKey = `spam_violations:${message.guild.id}:${message.author.id}`;
      const violations = (spamViolations.get(vKey) || 0) + 1;
      spamViolations.set(vKey, violations);
      const escalateActions = ['warn', 'mute', 'kick', 'ban'];
      const idx = Math.min(violations - 1, escalateActions.length - 1);
      action = escalateActions[idx];
    }

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

    if (!targetMember) return { action, user: message.author.tag };

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
    return { action, user: message.author.tag };
  } catch (err) {
    logger.error('executeSpamAction error:', err);
  }
  return null;
}

// ==================== ADVANCED ANTLINK DETECTION ====================

async function checkAdvancedLink(message, guildData) {
  if (!guildData.antilink_enabled) return null;

  const isOwn = isOwner(message.author.id);
  if (isOwn) return null;

  const wl = safeJsonParse(guildData.whitelist, []);
  if (wl.includes(message.author.id)) return null;

  const member = message.member;
  if (!member) return null;

  const bypassRole = guildData.antilink_bypass_role;
  if (hasBypassRole(member, bypassRole)) return null;

  const antilinkConfig = safeJsonParse(guildData.antilink_config, {});
  const ignoredChannels = antilinkConfig.ignoredChannels || [];
  const ignoredRoles = antilinkConfig.ignoredRoles || [];

  if (ignoredChannels.includes(message.channel.id)) return null;
  if (member.roles.cache.some(r => ignoredRoles.includes(r.id))) return null;

  const content = message.content;
  const logChannel = guildData.log_channel ? message.guild.channels.cache.get(guildData.log_channel) : null;

  // Domain blacklist check
  if (antilinkConfig.blacklistedDomains?.length > 0) {
    const domainRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/gi;
    let match;
    while ((match = domainRegex.exec(content)) !== null) {
      const domain = match[1].toLowerCase();
      if (antilinkConfig.blacklistedDomains.some(d => domain.includes(d.toLowerCase()))) {
        return await executeLinkAction(message, guildData, 'domain', `Blacklisted domain: ${domain}`, logChannel);
      }
    }
  }

  // Phishing detection with extended patterns
  const phishingPatterns = [
    /discord\.(gg|com)\/(nitro|free|gift|airdrop)/gi,
    /steamcommunity\.com\/(id|profiles)\/[a-z]+\/tradeoffer/gi,
    /(?:free|cheap|buy|sell)\s*(nitro|discord|boost)/gi,
    /@everyone.*(?:free|nitro|gift|claim)/gi,
    /(?:token|grab|steal|ip|dox)/gi,
    /(?:t\.me|telegram\.me)\/[\w]+/gi,
    /bit\.ly|tinyurl\.com|shorturl\.at/gi,
    /(?:login|verify|claim|secure).*discord/gi
  ];

  for (const pattern of phishingPatterns) {
    if (pattern.test(content)) {
      return await executeLinkAction(message, guildData, 'phishing', 'Phishing link detected', logChannel);
    }
  }

  // Rate limiting for links
  if (antilinkConfig.rateLimit) {
    const rlKey = `linkrate:${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    if (!linkCooldownTracker.has(rlKey)) linkCooldownTracker.set(rlKey, []);
    const rlTimestamps = linkCooldownTracker.get(rlKey);
    rlTimestamps.push(now);
    const recent = rlTimestamps.filter(t => now - t < 60000);
    linkCooldownTracker.set(rlKey, recent);

    const linkCount = (content.match(/https?:\/\/[^\s]+/gi) || []).length;
    if (recent.length > (antilinkConfig.rateLimit || 5) || linkCount > 3) {
      return await executeLinkAction(message, guildData, 'rate', 'Link rate limit exceeded', logChannel);
    }
  }

  return null;
}

async function executeLinkAction(message, guildData, type, reason, logChannel) {
  try {
    const antilinkConfig = safeJsonParse(guildData.antilink_config, {});
    const action = antilinkConfig.action || 'delete';
    const duration = antilinkConfig.duration || 5;

    await message.delete().catch(() => {});

    if (logChannel) {
      logChannel.send({
        embeds: [new EmbedBuilder()
          .setColor(0xff6600)
          .setTitle(`🔗 Link Blocked - ${type}`)
          .setDescription(`${message.author.tag} (${message.author.id})`)
          .addFields({ name: 'Reason', value: reason })
          .setTimestamp()
        ]
      }).catch(() => {});
    }

    const targetMember = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!targetMember) return { action, user: message.author.tag };

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
        await targetMember.kick(`Anti-link: ${reason}`);
        break;
      case 'ban':
        await targetMember.ban({ reason: `Anti-link: ${reason}` });
        break;
      case 'timeout':
        await targetMember.timeout(duration * 60 * 1000, `Anti-link: ${reason}`);
        break;
    }

    return { action, user: message.author.tag };
  } catch (err) {
    logger.error('executeLinkAction error:', err);
  }
  return null;
}

module.exports = {
  isOwner,
  isWhitelisted,
  hasBypassRole,
  ensureBypassRoles,
  checkAntiNukeChannelDelete,
  checkAntiNukeChannelCreate,
  checkAntiNukeRoleDelete,
  checkAntiNukeRoleCreate,
  checkAntiNukeMassBan,
  checkAntiNukeMassKick,
  checkAntiNukeGuildUpdate,
  checkAntiNukeRoleUpdate,
  checkAntiRaid,
  checkAntiSpam,
  checkAntiLink,
  checkAntiBot,
  checkAdvancedSpam,
  checkAdvancedLink
};
