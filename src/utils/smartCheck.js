const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const EMOJI = {
  yes: '\u2705',
  no: '\u274c',
  warn: '\u26a0\ufe0f',
  info: '\u2139\ufe0f',
  lock: '\U0001f512',
  unlock: '\U0001f513',
  check: '\U0001f50d'
};

function hasPermission(member, permission) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return member.permissions.has(permission);
}

function botHasPermission(guild, permission) {
  const me = guild.members.me;
  return hasPermission(me, permission);
}

function isChannelLocked(channel, guildId) {
  const everyone = channel.permissionOverwrites.cache.get(guildId);
  if (!everyone) return false;
  const deny = everyone.deny || everyone.deny;
  return deny.has('SendMessages') || deny.has(PermissionFlagsBits.SendMessages);
}

function isChannelNSFW(channel) {
  return channel.nsfw || channel.type === 15;
}

function isCategoryChannel(channel) {
  return channel.type === 4;
}

function isThread(channel) {
  return channel.isThread && channel.isThread();
}

function getBotRolePosition(guild) {
  return guild.members.me.roles.highest.position;
}

function canInteract(executor, target, guild) {
  if (!executor || !target) return { can: false, reason: 'Invalid members' };
  if (executor.id === guild.ownerId) return { can: true };
  if (target.id === guild.ownerId) return { can: false, reason: 'Cannot action the server owner' };
  if (executor.roles.highest.position <= target.roles.highest.position) {
    return { can: false, reason: 'Your role is not high enough to action this user' };
  }
  if (guild.members.me.roles.highest.position <= target.roles.highest.position) {
    return { can: false, reason: 'My role is not high enough to action this user' };
  }
  return { can: true };
}

function isInVoiceChannel(member) {
  return member?.voice?.channel != null;
}

function isBotInVoiceChannel(guild) {
  return guild.members.me?.voice?.channel != null;
}

function checkAll(executor, target, guild, action) {
  const issues = [];
  const info = [];

  const botMember = guild.members.me;
  if (!botMember) {
    issues.push('Bot is not in this server');
    return { ok: false, issues, info };
  }

  if (!executor) {
    issues.push('Could not identify command executor');
    return { ok: false, issues, info };
  }

  const botPerms = botMember.permissions;
  const isAdmin = botPerms.has(PermissionFlagsBits.Administrator);

  if (action === 'ban' || action === 'unban') {
    if (!isAdmin && !botPerms.has(PermissionFlagsBits.BanMembers)) {
      issues.push('Bot missing `Ban Members` permission');
    }
    if (!isAdmin && !executor.permissions?.has(PermissionFlagsBits.BanMembers)) {
      issues.push('You are missing `Ban Members` permission');
    }
  }

  if (action === 'kick') {
    if (!isAdmin && !botPerms.has(PermissionFlagsBits.KickMembers)) {
      issues.push('Bot missing `Kick Members` permission');
    }
    if (!isAdmin && !executor.permissions?.has(PermissionFlagsBits.KickMembers)) {
      issues.push('You are missing `Kick Members` permission');
    }
  }

  if (action === 'mute' || action === 'timeout') {
    if (!isAdmin && !botPerms.has(PermissionFlagsBits.ModerateMembers)) {
      issues.push('Bot missing `Moderate Members` permission');
    }
    if (!isAdmin && !executor.permissions?.has(PermissionFlagsBits.ModerateMembers)) {
      issues.push('You are missing `Moderate Members` permission');
    }
  }

  if (action === 'lock' || action === 'unlock' || action === 'purge') {
    if (!isAdmin && !botPerms.has(PermissionFlagsBits.ManageChannels)) {
      issues.push('Bot missing `Manage Channels` permission');
    }
    if (!isAdmin && !executor.permissions?.has(PermissionFlagsBits.ManageChannels)) {
      issues.push('You are missing `Manage Channels` permission');
    }
  }

  if (action === 'role') {
    if (!isAdmin && !botPerms.has(PermissionFlagsBits.ManageRoles)) {
      issues.push('Bot missing `Manage Roles` permission');
    }
    if (!isAdmin && !executor.permissions?.has(PermissionFlagsBits.ManageRoles)) {
      issues.push('You are missing `Manage Roles` permission');
    }
  }

  if (target) {
    if (target.bot) {
      info.push('Target is a bot account');
    }
    if (target.id === guild.ownerId) {
      issues.push('Target is the server owner — cannot action');
    }
    if (target.id === botMember.id) {
      issues.push('Cannot action myself');
    }
    if (target.id === executor.id) {
      info.push('Warning: You are actioning yourself');
    }
    const hierarchy = canInteract(executor, target, guild);
    if (!hierarchy.can) {
      issues.push(hierarchy.reason);
    }
  }

  return { ok: issues.length === 0, issues, info };
}

function buildCheckEmbed(action, channel, issues, info) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.check} Pre-check: ${action}`)
    .setColor(issues.length > 0 ? 0xff0000 : 0x00ff00)
    .setTimestamp();

  if (channel) {
    embed.setDescription(`Channel: <#${channel.id}> (${channel.name})`);
  }

  if (issues.length > 0) {
    embed.addFields({
      name: `${EMOJI.no} Issues Found`,
      value: issues.map(i => `\`${i}\``).join('\n')
    });
  }

  if (info.length > 0) {
    embed.addFields({
      name: `${EMOJI.info} Info`,
      value: info.map(i => `${i}`).join('\n')
    });
  }

  if (issues.length === 0) {
    embed.addFields({
      name: `${EMOJI.yes} All checks passed`,
      value: 'Proceeding with action...'
    });
  }

  return embed;
}

module.exports = {
  hasPermission,
  botHasPermission,
  isChannelLocked,
  isChannelNSFW,
  isCategoryChannel,
  isThread,
  getBotRolePosition,
  canInteract,
  isInVoiceChannel,
  isBotInVoiceChannel,
  checkAll,
  buildCheckEmbed,
  EMOJI
};
