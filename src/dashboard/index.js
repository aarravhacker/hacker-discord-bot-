const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const config = require('../config');
const securityEngine = require('../utils/securityEngine');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

let discordStrategyConfigured = false;

function configurePassport() {
  if (discordStrategyConfigured) return;
  if (!config.clientId || !config.clientSecret) {
    console.warn('[Dashboard] CLIENT_ID or CLIENT_SECRET not set. Discord OAuth will not work.');
    return;
  }
  const DiscordStrategy = require('passport-discord').Strategy;

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj, done) => done(null, obj));

  passport.use(new DiscordStrategy({
    clientID: config.clientId,
    clientSecret: config.clientSecret,
    callbackURL: config.dashboardCallbackUrl || `http://localhost:${PORT}/auth/callback`,
    scope: ['identify', 'guilds', 'guilds.members.read']
  }, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }));

  discordStrategyConfigured = true;
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: config.dashboardSecret || 'hacker-bot-dashboard-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

configurePassport();
if (discordStrategyConfigured) {
  app.use(passport.initialize());
  app.use(passport.session());
}

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not authenticated' });
  res.redirect('/auth/login');
}

function isOwner(req, res, next) {
  if (req.user && String(req.user.id) === String(config.ownerId)) return next();
  if (req.path.startsWith('/api/')) return res.status(403).json({ error: 'Unauthorized' });
  res.status(404).render('404', { user: req.user });
}

app.get('/', (req, res) => {
  res.redirect(302, 'http://localhost:3001');
});

app.get('/auth/login', (req, res) => {
  if (!discordStrategyConfigured) {
    return res.render('error', { user: null, message: 'Discord OAuth not configured. Set CLIENT_ID and CLIENT_SECRET in .env' });
  }
  passport.authenticate('discord')(req, res);
});
app.get('/auth/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/dashboard');
});
app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

app.get('/dashboard', isAuthenticated, (req, res) => {
  res.render('dashboard', { user: req.user });
});

app.get('/dashboard/guilds', isAuthenticated, (req, res) => {
  const guilds = req.user.guilds || [];
  res.render('guilds', { user: req.user, guilds });
});

app.get('/dashboard/guild/:id', isAuthenticated, isOwner, async (req, res) => {
  const guildId = req.params.id;
  res.render('guild-control', { user: req.user, guildId });
});

app.get('/api/stats', isAuthenticated, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    if (!client) return res.json({ error: 'Client not connected' });

    res.json({
      guilds: client.guilds.cache.size,
      users: client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
      channels: client.channels.cache.size,
      uptime: process.uptime(),
      memory: process.memoryUsage().heapUsed / 1024 / 1024
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('/api/guild/:id/channels', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.json({ error: 'Guild not found' });

    const channels = guild.channels.cache.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      position: c.position
    }));

    res.json({ channels });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('/api/guild/:id/members', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.json({ error: 'Guild not found' });

    await guild.members.fetch();
    const members = guild.members.cache.map(m => ({
      id: m.id,
      tag: m.user.tag,
      displayName: m.displayName,
      roles: m.roles.cache.map(r => r.name),
      joinedAt: m.joinedAt,
      premiumSince: m.premiumSince
    }));

    res.json({ members: members.slice(0, 50) });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('/api/guild/:id/roles', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.json({ error: 'Guild not found' });

    const roles = guild.roles.cache.map(r => ({
      id: r.id,
      name: r.name,
      color: r.hexColor,
      position: r.position,
      memberCount: r.members.size
    }));

    res.json({ roles });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('/api/guild/:id/logs', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getModLogs } = require('../db/modRepository');
    const logs = await getModLogs(req.params.id, 50);
    res.json({ logs });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('/api/guild/:id/security', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getGuild } = require('../db/guildRepository');
    const guild = await getGuild(req.params.id);
    res.json({
      antinuke_enabled: guild.antinuke_enabled,
      antinuke_config: JSON.parse(guild.antinuke_config || '{}'),
      antiraid_enabled: guild.antiraid_enabled,
      antiraid_config: JSON.parse(guild.antiraid_config || '{}'),
      antibot_enabled: guild.antibot_enabled,
      antibot_config: JSON.parse(guild.antibot_config || '{}'),
      antilink_enabled: guild.antilink_enabled,
      antilink_config: JSON.parse(guild.antilink_config || '{}'),
      antispam_enabled: guild.antispam_enabled,
      antispam_config: JSON.parse(guild.antispam_config || '{}'),
      lockdown_enabled: guild.lockdown_enabled,
      lockdown_config: JSON.parse(guild.lockdown_config || '{}'),
      log_channel: guild.log_channel,
      whitelist: JSON.parse(guild.whitelist || '[]'),
      blacklist: JSON.parse(guild.blacklist || '[]'),
      antinuke_bypass_role: guild.antinuke_bypass_role,
      antiraid_bypass_role: guild.antiraid_bypass_role,
      antispam_bypass_role: guild.antispam_bypass_role
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.post('/api/guild/:id/security/toggle', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { updateGuild } = require('../db/guildRepository');
    const { feature, enabled } = req.body;
    const validFeatures = ['antinuke', 'antiraid', 'antibot', 'antilink', 'antispam', 'lockdown'];
    if (!validFeatures.includes(feature)) return res.json({ success: false, error: 'Invalid feature' });

    await updateGuild(req.params.id, { [`${feature}_enabled`]: enabled });
    res.json({ success: true, message: `${feature} ${enabled ? 'enabled' : 'disabled'}` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/security/config', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { updateGuild } = require('../db/guildRepository');
    const { feature, config } = req.body;
    const validFeatures = ['antinuke', 'antiraid', 'antibot', 'antilink', 'antispam', 'lockdown'];
    if (!validFeatures.includes(feature)) return res.json({ success: false, error: 'Invalid feature' });

    await updateGuild(req.params.id, { [`${feature}_config`]: JSON.stringify(config) });
    res.json({ success: true, message: `${feature} config updated` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/security/logchannel', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { updateGuild } = require('../db/guildRepository');
    const { channelId } = req.body;
    await updateGuild(req.params.id, { log_channel: channelId || null });
    res.json({ success: true, message: channelId ? 'Log channel set' : 'Log channel cleared' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/security/create-bypass-role', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getGuild, updateGuild } = require('../db/guildRepository');
    const { type } = req.body;
    const validTypes = ['antinuke', 'antiraid', 'antispam'];
    if (!validTypes.includes(type)) return res.json({ success: false, error: 'Invalid type' });

    const guild = await client.guilds.fetch(req.params.id).catch(() => null);
    if (!guild) return res.json({ success: false, error: 'Guild not found' });

    const field = `${type}_bypass_role`;
    const guildData = await getGuild(req.params.id);
    if (guildData[field]) {
      const existingRole = guild.roles.cache.get(guildData[field]);
      if (existingRole) return res.json({ success: true, message: `Bypass role already exists: ${existingRole.name}` });
    }

    const roleColors = { antinuke: '#ff4444', antiraid: '#ff8800', antispam: '#ffaa00' };
    const role = await guild.roles.create({
      name: `Security Bypass - ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      color: roleColors[type] || '#888888',
      permissions: [],
      reason: 'Auto-created security bypass role'
    });

    await updateGuild(req.params.id, { [field]: role.id });
    res.json({ success: true, message: `Created bypass role: ${role.name}`, roleId: role.id });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/security/whitelist', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { updateGuild, getGuild } = require('../db/guildRepository');
    const { userId, action } = req.body;
    const guild = await getGuild(req.params.id);
    let whitelist = JSON.parse(guild.whitelist || '[]');

    if (action === 'add') {
      if (!whitelist.includes(userId)) whitelist.push(userId);
    } else if (action === 'remove') {
      whitelist = whitelist.filter(id => id !== userId);
    }

    await updateGuild(req.params.id, { whitelist: JSON.stringify(whitelist) });
    res.json({ success: true, message: `Whitelist ${action}ed`, whitelist });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/security/blacklist', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { updateGuild, getGuild } = require('../db/guildRepository');
    const { userId, action } = req.body;
    const guild = await getGuild(req.params.id);
    let blacklist = JSON.parse(guild.blacklist || '[]');

    if (action === 'add') {
      if (!blacklist.includes(userId)) blacklist.push(userId);
    } else if (action === 'remove') {
      blacklist = blacklist.filter(id => id !== userId);
    }

    await updateGuild(req.params.id, { blacklist: JSON.stringify(blacklist) });
    res.json({ success: true, message: `Blacklist ${action}ed`, blacklist });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/api/guild/:id/security/logs', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    const logs = await db('security_actions').where('guild_id', req.params.id).orderBy('created_at', 'desc').limit(50);
    res.json({ logs });
  } catch (err) {
    res.json({ error: err.message, logs: [] });
  }
});

app.get('/api/guild/:id/security/incidents', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    const incidents = await db('security_incidents').where('guild_id', req.params.id).orderBy('created_at', 'desc').limit(50);
    res.json({ incidents });
  } catch (err) {
    res.json({ error: err.message, incidents: [] });
  }
});

app.post('/api/guild/:id/security/incident/:incidentId/resolve', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    await db('security_incidents').where('id', req.params.incidentId).update({ resolved: true });
    res.json({ success: true, message: 'Incident resolved' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/api/guild/:id/security/trust', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    const trust = await db('security_trust').where('guild_id', req.params.id).orderBy('trust_score', 'desc').limit(50);
    res.json({ trust });
  } catch (err) {
    res.json({ error: err.message, trust: [] });
  }
});

app.post('/api/guild/:id/security/trust', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    const { userId, score, flag } = req.body;
    const existing = await db('security_trust').where({ guild_id: req.params.id, user_id: userId }).first();
    if (existing) {
      const update = {};
      if (score !== undefined) update.trust_score = score;
      if (flag !== undefined) update.is_flagged = flag;
      await db('security_trust').where('id', existing.id).update(update);
    }
    res.json({ success: true, message: 'Trust updated' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/api/guild/:id/security/snapshots', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    const snapshots = await db('security_snapshots').where('guild_id', req.params.id).orderBy('created_at', 'desc').limit(10);
    res.json({ snapshots: snapshots.map(s => ({ id: s.id, created_at: s.created_at })) });
  } catch (err) {
    res.json({ error: err.message, snapshots: [] });
  }
});

app.post('/api/guild/:id/security/snapshot', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const { getDB } = require('../db/connection');
    const db = getDB();
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.json({ success: false, error: 'Guild not found' });

    const snapshot = {
      channels: guild.channels.cache.map(c => ({ id: c.id, name: c.name, type: c.type, position: c.position })),
      roles: guild.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position, permissions: r.permissions.bitfield.toString() })),
      memberCount: guild.memberCount
    };

    await db('security_snapshots').insert({ guild_id: req.params.id, data: JSON.stringify(snapshot) });
    res.json({ success: true, message: 'Snapshot created' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/security/lockdown-all', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.json({ success: false, error: 'Guild not found' });

    const channels = guild.channels.cache.filter(c => c.isTextBased() && c.type === 0);
    let count = 0;
    for (const [, ch] of channels) {
      try {
        await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
        count++;
      } catch (e) {}
    }
    res.json({ success: true, message: `Locked ${count} channels` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/security/unlock-all', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.json({ success: false, error: 'Guild not found' });

    const channels = guild.channels.cache.filter(c => c.isTextBased() && c.type === 0);
    let count = 0;
    for (const [, ch] of channels) {
      try {
        await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true });
        count++;
      } catch (e) {}
    }
    res.json({ success: true, message: `Unlocked ${count} channels` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/security/raid-purge', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.json({ success: false, error: 'Guild not found' });

    const { hours } = req.body;
    const since = Date.now() - ((hours || 24) * 3600000);
    await guild.members.fetch();
    const recentJoins = guild.members.cache.filter(m => m.joinedTimestamp > since && !m.user.bot);

    let kicked = 0;
    for (const [, member] of recentJoins) {
      try {
        await member.kick('Raid purge from dashboard');
        kicked++;
      } catch (e) {}
    }
    res.json({ success: true, message: `Purged ${kicked} recent members` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/security/bot-purge', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.json({ success: false, error: 'Guild not found' });

    await guild.members.fetch();
    const bots = guild.members.cache.filter(m => m.user.bot && m.id !== client.user.id);

    let kicked = 0;
    for (const [, member] of bots) {
      try {
        await member.kick('Unauthorized bot removed from dashboard');
        kicked++;
      } catch (e) {}
    }
    res.json({ success: true, message: `Removed ${kicked} bots` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/dashboard/guild/:id/embed', isAuthenticated, isOwner, async (req, res) => {
  res.render('embed-builder', { user: req.user, guildId: req.params.id });
});

app.get('/api/guild/:id/channel/:channelId/messages', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.json({ error: 'Guild not found', messages: [], channelName: '' });

    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel) return res.json({ error: 'Channel not found', messages: [], channelName: '' });

    if (!channel.isTextBased() || channel.type === 4) {
      return res.json({ error: 'Cannot read messages from this channel type', messages: [], channelName: channel.name });
    }

    let messages;
    try {
      messages = await channel.messages.fetch({ limit: 25, force: true });
    } catch (fetchErr) {
      try {
        const { REST, Routes } = require('discord.js');
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        const raw = await rest.get(Routes.channelMessages(channel.id), { query: new URLSearchParams({ limit: '25' }) });
        messages = raw.map(m => ({
          id: m.id,
          content: m.content || '',
          author: {
            id: m.author.id,
            tag: m.author.global_name || m.author.username || 'Unknown',
            displayAvatarURL: () => `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.png`,
            bot: m.author.bot || false
          },
          createdTimestamp: new Date(m.timestamp).getTime(),
          embeds: m.embeds || [],
          attachments: m.attachments || []
        }));
      } catch (restErr) {
        return res.json({ error: `Cannot read messages: ${fetchErr.message}`, messages: [], channelName: channel.name });
      }
    }

    const formatted = (Array.isArray(messages) ? messages : [...messages.values()]).map(m => ({
      id: m.id,
      content: m.content || '',
      author: {
        id: m.author.id,
        tag: m.author.tag || m.author.global_name || m.author.username || 'Unknown',
        avatar: typeof m.author.displayAvatarURL === 'function' ? m.author.displayAvatarURL({ size: 64 }) : `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.png?size=64`,
        bot: m.author.bot || false
      },
      timestamp: m.createdTimestamp || new Date(m.timestamp).getTime(),
      embeds: Array.isArray(m.embeds) ? m.embeds.length : 0,
      attachments: Array.isArray(m.attachments) ? m.attachments.size || m.attachments.length : 0
    }));

    res.json({ messages: formatted, channelName: channel.name });
  } catch (err) {
    res.json({ error: err.message, messages: [], channelName: '' });
  }
});

app.post('/api/guild/:id/channel/:channelId/lock', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    const channel = guild.channels.cache.get(req.params.channelId);

    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      SendMessages: false
    });

    res.json({ success: true, message: `Locked #${channel.name}` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/channel/:channelId/unlock', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    const channel = guild.channels.cache.get(req.params.channelId);

    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      SendMessages: true
    });

    res.json({ success: true, message: `Unlocked #${channel.name}` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/member/:memberId/kick', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    const member = await guild.members.fetch(req.params.memberId);

    await member.kick(req.body.reason || 'Kicked from dashboard');
    res.json({ success: true, message: `Kicked ${member.user.tag}` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/member/:memberId/ban', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    const member = await guild.members.fetch(req.params.memberId);

    await member.ban({ reason: req.body.reason || 'Banned from dashboard' });
    res.json({ success: true, message: `Banned ${member.user.tag}` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/member/:memberId/mute', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const { getGuild } = require('../db/guildRepository');
    const guildConfig = await getGuild(req.params.id);

    if (!guildConfig?.mute_role) {
      return res.json({ success: false, error: 'Mute role not configured' });
    }

    const guild = client.guilds.cache.get(req.params.id);
    const member = await guild.members.fetch(req.params.memberId);

    await member.roles.add(guildConfig.mute_role, 'Muted from dashboard');
    res.json({ success: true, message: `Muted ${member.user.tag}` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/api/guild/:id/text-channels', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.json({ error: 'Guild not found' });

    const channels = guild.channels.cache
      .filter(c => c.isTextBased() && c.type === 0)
      .map(c => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ channels });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.post('/api/guild/:id/send-embed', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const { EmbedBuilder } = require('discord.js');
    const { channelId, content, title, description, color, authorName, authorIcon, footerText, imageUrl, thumbnailUrl, fields } = req.body;

    if (!channelId) return res.json({ success: false, error: 'Channel ID is required' });

    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.json({ success: false, error: 'Guild not found' });

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.json({ success: false, error: 'Channel not found' });

    const embed = new EmbedBuilder();

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (color) embed.setColor(color);
    else embed.setColor(0x5865f2);
    if (authorName) embed.setAuthor({ name: authorName, iconURL: authorIcon || undefined });
    if (footerText) embed.setFooter({ text: footerText });
    if (imageUrl) embed.setImage(imageUrl);
    if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
    embed.setTimestamp();

    if (fields && Array.isArray(fields)) {
      fields.forEach(f => {
        if (f.name && f.value) {
          embed.addFields({ name: f.name, value: f.value, inline: f.inline || false });
        }
      });
    }

    await channel.send({ content: content || null, embeds: [embed] });

    res.json({ success: true, message: `Embed sent to #${channel.name}` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/send-text', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const { channelId, content } = req.body;

    if (!channelId || !content) return res.json({ success: false, error: 'Channel and content are required' });

    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.json({ success: false, error: 'Guild not found' });

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.json({ success: false, error: 'Channel not found' });

    await channel.send({ content });

    res.json({ success: true, message: `Message sent to #${channel.name}` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/create-channel', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const { ChannelType } = require('discord.js');
    const { name, type, category, topic, nsfw } = req.body;
    if (!name) return res.json({ success: false, error: 'Channel name required' });

    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.json({ success: false, error: 'Guild not found' });

    const typeMap = { text: 0, voice: 2, announcement: 5, stage: 13, forum: 15 };
    const channelType = typeMap[type] || 0;

    const channel = await guild.channels.create({
      name: name.toLowerCase().replace(/\s+/g, '-'),
      type: channelType,
      parent: category || null,
      topic: topic || null,
      nsfw: nsfw || false
    });

    res.json({ success: true, message: `Created #${channel.name}` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/channel/:channelId/delete', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel) return res.json({ success: false, error: 'Channel not found' });
    const name = channel.name;
    await channel.delete();
    res.json({ success: true, message: `Deleted #${name}` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/channel/:channelId/edit', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel) return res.json({ success: false, error: 'Channel not found' });

    const { name, topic, nsfw, slowmode, category } = req.body;
    const editData = {};
    if (name) editData.name = name.toLowerCase().replace(/\s+/g, '-');
    if (topic !== undefined) editData.topic = topic;
    if (nsfw !== undefined) editData.nsfw = nsfw;
    if (slowmode !== undefined) editData.rateLimitPerUser = parseInt(slowmode) || 0;
    if (category !== undefined) editData.parent = category || null;

    await channel.edit(editData);
    res.json({ success: true, message: `Updated #${channel.name}` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/channel/:channelId/clone', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel) return res.json({ success: false, error: 'Channel not found' });

    const clone = await channel.clone();
    res.json({ success: true, message: `Cloned as #${clone.name}`, channel: { id: clone.id, name: clone.name } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/create-role', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const { PermissionsBitField } = require('discord.js');
    const { name, color, hoist, mentionable, permissions } = req.body;
    if (!name) return res.json({ success: false, error: 'Role name required' });

    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.json({ success: false, error: 'Guild not found' });

    const perms = permissions && permissions.length > 0
      ? permissions.reduce((acc, p) => acc | (PermissionsBitField.Flags[p] || 0n), 0n)
      : 0n;

    const role = await guild.roles.create({
      name,
      color: color || '#5865f2',
      hoist: hoist || false,
      mentionable: mentionable || false,
      permissions: perms
    });

    res.json({ success: true, message: `Created role "${role.name}"` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.delete('/api/guild/:id/role/:roleId', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    const role = guild.roles.cache.get(req.params.roleId);
    if (!role) return res.json({ success: false, error: 'Role not found' });
    const name = role.name;
    await role.delete();
    res.json({ success: true, message: `Deleted role "${name}"` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/role/:roleId/edit', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    const role = guild.roles.cache.get(req.params.roleId);
    if (!role) return res.json({ success: false, error: 'Role not found' });

    const { name, color, hoist, mentionable, position } = req.body;
    if (name) await role.setName(name);
    if (color) await role.setColor(color);
    if (hoist !== undefined) await role.setHoist(hoist);
    if (mentionable !== undefined) await role.setMentionable(mentionable);
    if (position) await role.setPosition(position);

    res.json({ success: true, message: `Updated role "${role.name}"` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/api/guild/:id/member/:memberId/info', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.json({ error: 'Guild not found' });

    const member = await guild.members.fetch(req.params.memberId).catch(() => null);
    if (!member) return res.json({ error: 'Member not found' });

    const roles = guild.roles.cache
      .filter(r => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => ({
        id: r.id,
        name: r.name,
        color: r.hexColor,
        has: member.roles.cache.has(r.id)
      }));

    res.json({
      id: member.id,
      tag: member.user.tag,
      displayName: member.displayName,
      avatar: member.user.displayAvatarURL({ size: 128 }),
      roles: member.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
      joinedAt: member.joinedAt,
      premiumSince: member.premiumSince,
      isTimedOut: member.isCommunicationDisabled(),
      timeoutUntil: member.communicationDisabledUntil,
      allRoles: roles
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.post('/api/guild/:id/member/:memberId/roles', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    const member = await guild.members.fetch(req.params.memberId);
    const { addRoles, removeRoles } = req.body;

    if (addRoles && addRoles.length) {
      for (const roleId of addRoles) {
        if (!member.roles.cache.has(roleId)) await member.roles.add(roleId);
      }
    }
    if (removeRoles && removeRoles.length) {
      for (const roleId of removeRoles) {
        if (member.roles.cache.has(roleId)) await member.roles.remove(roleId);
      }
    }

    res.json({ success: true, message: `Updated roles for ${member.user.tag}`, roles: member.roles.cache.map(r => r.name) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/member/:memberId/nickname', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    const member = await guild.members.fetch(req.params.memberId);
    const { nickname } = req.body;
    await member.setNickname(nickname || null);
    res.json({ success: true, message: `Nickname updated for ${member.user.tag}` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/api/guild/:id/role/:roleId/perms', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    const role = guild.roles.cache.get(req.params.roleId);
    if (!role) return res.json({ error: 'Role not found' });

    const { PermissionsBitField } = require('discord.js');
    const flags = PermissionsBitField.Flags;
    const perms = Object.keys(flags).filter(k => (role.permissions.bitfield & flags[k]) !== 0n);

    res.json({ perms });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.post('/api/guild/:id/role/:roleId/perms', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const { PermissionsBitField } = require('discord.js');
    const guild = client.guilds.cache.get(req.params.id);
    const role = guild.roles.cache.get(req.params.roleId);
    if (!role) return res.json({ success: false, error: 'Role not found' });

    const { permissions } = req.body;
    const perms = permissions && permissions.length > 0
      ? permissions.reduce((acc, p) => acc | (PermissionsBitField.Flags[p] || 0n), 0n)
      : 0n;

    await role.setPermissions(perms);
    res.json({ success: true, message: `Updated permissions for "${role.name}"` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/api/guild/:id/channel/:channelId/perms', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel) return res.json({ error: 'Channel not found' });

    const overwrites = channel.permissionOverwrites.cache.map(o => ({
      id: o.id,
      name: o.type === 0 ? (guild.roles.cache.get(o.id)?.name || 'Unknown Role') : (guild.members.cache.get(o.id)?.user?.tag || 'Unknown User'),
      type: o.type
    }));

    res.json({ channelName: channel.name, overwrites });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('/api/guild/:id/channel/:channelId/perms/:targetId', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const { PermissionsBitField } = require('discord.js');
    const guild = client.guilds.cache.get(req.params.id);
    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel) return res.json({ error: 'Channel not found' });

    const overwrite = channel.permissionOverwrites.cache.get(req.params.targetId);
    if (!overwrite) return res.json({ perms: [] });

    const flags = PermissionsBitField.Flags;
    const perms = Object.keys(flags).filter(k => (overwrite.allow.bitfield & flags[k]) !== 0n);

    res.json({ perms });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.post('/api/guild/:id/channel/:channelId/perms', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const { PermissionsBitField } = require('discord.js');
    const guild = client.guilds.cache.get(req.params.id);
    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel) return res.json({ success: false, error: 'Channel not found' });

    const { targetId, permissions } = req.body;
    const allow = permissions && permissions.length > 0
      ? permissions.reduce((acc, p) => acc | (PermissionsBitField.Flags[p] || 0n), 0n)
      : 0n;

    const isRole = guild.roles.cache.has(targetId);
    await channel.permissionOverwrites.edit(targetId, {
      [isRole ? 'Roles' : 'Members']: isRole ? targetId : guild.members.cache.get(targetId),
      Allow: allow,
      Deny: 0n
    });

    res.json({ success: true, message: 'Permissions updated' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/guild/:id/member/:memberId/timeout', isAuthenticated, isOwner, async (req, res) => {
  try {
    const client = req.app.get('discordClient');
    const guild = client.guilds.cache.get(req.params.id);
    const member = await guild.members.fetch(req.params.memberId);
    const { duration, reason } = req.body;

    const match = duration?.match(/^(\d+)([smhdw])$/i);
    if (!match) return res.json({ success: false, error: 'Invalid duration format' });

    const num = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 }[unit] * num;

    await member.timeout(ms, reason || 'Timed out from dashboard');
    res.json({ success: true, message: `Timed out ${member.user.tag} for ${duration}` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ========== ECONOMY DASHBOARD ==========
app.get('/dashboard/economy', isAuthenticated, isOwner, (req, res) => {
  res.render('economy', { user: req.user });
});

app.get('/api/economy/global-stats', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();

    const totalUsers = await db('users').count('* as count').first();
    const totalBalance = await db('users').sum('balance as total').first();
    const totalBank = await db('users').sum('bank as total').first();
    const totalMoney = (totalBalance?.total || 0) + (totalBank?.total || 0);
    const avgBalance = await db('users').avg('balance as avg').first();
    const avgBank = await db('users').avg('bank as avg').first();
    const maxBalance = await db('users').max('balance as max').first();
    const maxBank = await db('users').max('bank as max').first();
    const richhestUser = await db('users').orderByRaw('balance + bank DESC').first();
    const guildCount = await db('users').distinct('guild_id').count('* as count').first();
    const totalItems = await db('users').select('inventory').then(rows => {
      let count = 0;
      rows.forEach(r => { try { count += JSON.parse(r.inventory || '[]').length; } catch(e) {} });
      return count;
    });

    res.json({
      totalUsers: totalUsers?.count || 0,
      totalBalance: totalBalance?.total || 0,
      totalBank: totalBank?.total || 0,
      totalMoney,
      avgBalance: Math.round(avgBalance?.avg || 0),
      avgBank: Math.round(avgBank?.avg || 0),
      maxBalance: maxBalance?.max || 0,
      maxBank: maxBank?.max || 0,
      richestUser: richhestUser ? { user_id: richhestUser.user_id, total: (richhestUser.balance || 0) + (richhestUser.bank || 0) } : null,
      guildCount: guildCount?.count || 0,
      totalItems
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('/api/economy/leaderboard', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    const limit = parseInt(req.query.limit) || 50;
    const sort = req.query.sort || 'total';
    const guildId = req.query.guild || null;

    let query = db('users').select('*');
    if (guildId) query = query.where('guild_id', guildId);

    if (sort === 'balance') query = query.orderBy('balance', 'desc');
    else if (sort === 'bank') query = query.orderBy('bank', 'desc');
    else query = query.orderByRaw('balance + bank DESC');

    const users = await query.limit(limit);
    res.json({ users });
  } catch (err) {
    res.json({ error: err.message, users: [] });
  }
});

app.get('/api/economy/users', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    const search = req.query.search || '';
    const guildId = req.query.guild || null;
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;

    let query = db('users').select('*');
    let countQuery = db('users').count('* as total');

    if (search) {
      query = query.where('user_id', 'like', `%${search}%`);
      countQuery = countQuery.where('user_id', 'like', `%${search}%`);
    }
    if (guildId) {
      query = query.where('guild_id', guildId);
      countQuery = countQuery.where('guild_id', guildId);
    }

    const users = await query.orderByRaw('balance + bank DESC').limit(limit).offset(offset);
    const count = await countQuery.first();

    res.json({ users, total: count?.total || 0, page, limit });
  } catch (err) {
    res.json({ error: err.message, users: [], total: 0 });
  }
});

app.get('/api/economy/user/:userId', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    const users = await db('users').where('user_id', req.params.userId).select('*');
    res.json({ users });
  } catch (err) {
    res.json({ error: err.message, users: [] });
  }
});

app.post('/api/economy/user/:userId/update', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    const { guildId, balance, bank } = req.body;

    const update = {};
    if (balance !== undefined) update.balance = parseInt(balance);
    if (bank !== undefined) update.bank = parseInt(bank);

    await db('users').where('user_id', req.params.userId).where('guild_id', guildId).update(update);
    res.json({ success: true, message: 'User economy updated' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/economy/user/:userId/give', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    const { guildId, amount, target } = req.body;
    const a = parseInt(amount);
    if (isNaN(a) || a <= 0) return res.json({ success: false, error: 'Invalid amount' });

    const col = target === 'bank' ? 'bank' : 'balance';
    const user = await db('users').where('user_id', req.params.userId).where('guild_id', guildId).first();
    if (!user) return res.json({ success: false, error: 'User not found' });

    await db('users').where('user_id', req.params.userId).where('guild_id', guildId).update({ [col]: user[col] + a });
    res.json({ success: true, message: `Gave $${a.toLocaleString()} to ${target}`, newBalance: user[col] + a });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/economy/user/:userId/take', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    const { guildId, amount, target } = req.body;
    const a = parseInt(amount);
    if (isNaN(a) || a <= 0) return res.json({ success: false, error: 'Invalid amount' });

    const col = target === 'bank' ? 'bank' : 'balance';
    const user = await db('users').where('user_id', req.params.userId).where('guild_id', guildId).first();
    if (!user) return res.json({ success: false, error: 'User not found' });

    const newVal = Math.max(0, user[col] - a);
    await db('users').where('user_id', req.params.userId).where('guild_id', guildId).update({ [col]: newVal });
    res.json({ success: true, message: `Took $${a.toLocaleString()} from ${target}`, newBalance: newVal });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/economy/user/:userId/reset', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    const { guildId } = req.body;
    await db('users').where('user_id', req.params.userId).where('guild_id', guildId).update({ balance: 0, bank: 0, inventory: '[]', daily_streak: 0 });
    res.json({ success: true, message: 'User economy reset' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/api/economy/guilds', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    const guilds = await db('users').select('guild_id').count('* as userCount').sum('balance as totalBalance').sum('bank as totalBank').groupBy('guild_id');
    res.json({ guilds });
  } catch (err) {
    res.json({ error: err.message, guilds: [] });
  }
});

app.get('/api/economy/shop-items', isAuthenticated, isOwner, (req, res) => {
  const items = [
    { id: 1, name: 'Fishing Rod', price: 100, sell: 70, emoji: '🎣', desc: 'Catch fish for money' },
    { id: 2, name: 'Pickaxe', price: 250, sell: 175, emoji: '⛏️', desc: 'Mine for valuable ores' },
    { id: 3, name: 'Laptop', price: 500, sell: 350, emoji: '💻', desc: 'Start a coding business' },
    { id: 4, name: 'Car', price: 2000, sell: 1400, emoji: '🚗', desc: 'Work as a taxi driver' },
    { id: 5, name: 'House', price: 10000, sell: 7000, emoji: '🏠', desc: 'Rent out for passive income' },
    { id: 6, name: 'Diamond Sword', price: 750, sell: 525, emoji: '⚔️', desc: 'A powerful weapon' },
    { id: 7, name: 'Shield', price: 300, sell: 210, emoji: '🛡️', desc: 'Protect yourself' },
    { id: 8, name: 'Potion', price: 50, sell: 35, emoji: '🧪', desc: 'Restore health' },
    { id: 9, name: 'Gem', price: 1500, sell: 1050, emoji: '💎', desc: 'A valuable gemstone' },
    { id: 10, name: 'Crown', price: 5000, sell: 3500, emoji: '👑', desc: 'A golden crown' }
  ];
  res.json({ items });
});

app.get('/api/economy/item-ownership', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    const rows = await db('users').select('user_id', 'guild_id', 'inventory');
    const ownership = {};
    rows.forEach(r => {
      try {
        const inv = JSON.parse(r.inventory || '[]');
        inv.forEach(itemId => {
          if (!ownership[itemId]) ownership[itemId] = { count: 0, holders: [] };
          ownership[itemId].count++;
          if (!ownership[itemId].holders.includes(r.user_id)) ownership[itemId].holders.push(r.user_id);
        });
      } catch(e) {}
    });
    res.json({ ownership });
  } catch (err) {
    res.json({ error: err.message, ownership: {} });
  }
});

app.get('/api/economy/activity', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    const recentDaily = await db('users').whereNotNull('last_daily').orderBy('last_daily', 'desc').limit(10).select('user_id', 'guild_id', 'last_daily', 'daily_streak');
    const recentWork = await db('users').whereNotNull('last_work').orderBy('last_work', 'desc').limit(10).select('user_id', 'guild_id', 'last_work');
    const activeJobs = await db('users').whereNotNull('job').select('job').count('* as count').groupBy('job');
    res.json({ recentDaily, recentWork, activeJobs });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ==================== SECURITY MONITOR ====================

app.get('/dashboard/security/:id', isAuthenticated, isOwner, async (req, res) => {
  const guildId = req.params.id;
  res.render('security-monitor', { user: req.user, guildId, stage: 0, stageName: 'Normal', antinuke: true, antiraid: true, antilink: true, antispam: true, antibot: true, lockdown: true });
});

app.get('/api/security/:id/monitor', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const securityEngine = require('../utils/securityEngine');
    const db = getDB();
    const guildId = req.params.id;

    const stageData = securityEngine.getStage(guildId);
    const recentLogs = await db('security_logs').where('guild_id', guildId).orderBy('id', 'desc').limit(100);
    const incidents = await db('security_incidents').where('guild_id', guildId).count('id as count').first();
    const blocked = recentLogs.filter(l => l.action.includes('blocked') || l.action.includes('punish')).length;

    const uniqueUsers = new Set(recentLogs.map(l => l.user_id));
    const riskScores = [...securityEngine.trustScores.entries()]
      .filter(([k]) => k.startsWith(guildId))
      .map(([k, v]) => ({ id: k.split(':')[1], score: v.score || 0, level: v.level || 'Newcomer', tag: v.tag || k.split(':')[1] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const guildData = await db('guilds').where('guild_id', guildId).first();

    res.json({
      stage: stageData.stage,
      stageName: stageData.name,
      totalEvents: recentLogs.length,
      incidents: incidents?.count || 0,
      blocked,
      activeUsers: uniqueUsers.size,
      risks: riskScores,
      incidentsList: recentLogs.slice(0, 20).map(l => ({ type: l.action, details: l.details, timestamp: l.id })),
      protections: {
        antinuke: guildData?.antinuke_enabled || false,
        antiraid: guildData?.antiraid_enabled || false,
        antilink: guildData?.antilink_enabled || false,
        antispam: guildData?.antispam_enabled || false,
        antibot: guildData?.antibot_enabled || false,
        lockdown: guildData?.lockdown_enabled || false
      }
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

const securityClients = new Map();

app.get('/api/security/:id/events', isAuthenticated, (req, res) => {
  const guildId = req.params.id;
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write('data: {"text":"Connected to security monitor","type":"info"}\n\n');

  const clientId = `${guildId}:${Date.now()}`;
  if (!securityClients.has(guildId)) securityClients.set(guildId, new Map());
  securityClients.get(guildId).set(clientId, res);

  req.on('close', () => {
    const clients = securityClients.get(guildId);
    if (clients) clients.delete(clientId);
  });
});

function broadcastSecurityEvent(guildId, text, type = 'info') {
  const clients = securityClients.get(guildId);
  if (!clients) return;
  const data = JSON.stringify({ text, type, timestamp: Date.now() });
  for (const [, res] of clients) {
    res.write(`data: ${data}\n\n`);
  }
}

app.post('/api/security/:id/freeze', isAuthenticated, isOwner, async (req, res) => {
  try {
    const securityEngine = require('../utils/securityEngine');
    const guildId = req.params.id;
    const { type, unfreeze } = req.body;
    if (unfreeze) {
      securityEngine.unfreeze(guildId, type || 'global');
    } else {
      securityEngine.freeze(guildId, type || 'global');
    }
    broadcastSecurityEvent(guildId, `Freeze ${unfreeze ? 'removed' : 'activated'}: ${type || 'global'}`, 'danger');
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.post('/api/security/:id/lockdown', isAuthenticated, isOwner, async (req, res) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    const guildId = req.params.id;
    const { enabled } = req.body;
    await db('guilds').where('guild_id', guildId).update({ lockdown_enabled: enabled });
    broadcastSecurityEvent(guildId, `Lockdown ${enabled ? 'activated' : 'deactivated'}`, 'danger');
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.use((err, req, res, next) => {
  console.error('[Dashboard Error]', err.message);
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: err.message });
  res.status(500).render('error', { user: req.user || null, message: 'Internal server error' });
});

function getClient(req) {
  return req.app.get('discordClient');
}

function getGuild(req) {
  const client = getClient(req);
  if (!client) return null;
  return client.guilds.cache.get(req.params.id) || null;
}

function startDashboard(client) {
  app.set('discordClient', client);

  const originalLogIncident = securityEngine.logIncident.bind(securityEngine);
  securityEngine.logIncident = function(guildId, type, action, details) {
    originalLogIncident(guildId, type, action, details);
    broadcastSecurityEvent(guildId, `[${type}] ${action}: ${JSON.stringify(details).substring(0, 100)}`, type === 'nuke' ? 'danger' : type === 'raid' ? 'warning' : 'info');
  };

  app.listen(PORT, () => {
    console.log(`Dashboard running on http://localhost:${PORT}`);
  });
}

module.exports = { startDashboard };
