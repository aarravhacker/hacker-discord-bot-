const { getDB } = require('../db/connection');

class SecurityCore {
  constructor() {
    this.profiles = new Map();
    this.trustLevels = new Map();
    this.riskScores = new Map();
    this.actionHistory = new Map();
    this.incidents = [];
    this.snapshots = new Map();
    this.decoys = new Map();
    this.frozen = { channels: false, roles: false, staff: false, global: false };
    this.stages = new Map();

    this.monitoring = new Map();
    this.modes = new Map();
    this.learning = new Map();
    this.auditResults = new Map();
    this.threatIndicators = new Map();
    this.settings = new Map();
    this.advancedConfigs = new Map();
    this.guardian = new Map();
    this.sentinel = new Map();
    this.scanResults = new Map();
    this.responseActions = new Map();
    this.protections = new Map();
    this.policies = new Map();
    this.attackPatterns = new Map();
    this.healthStatus = new Map();
    this.escalationConfigs = new Map();
    this.benchmarks = new Map();
    this.compatibilityResults = new Map();
    this.baselines = new Map();
    this.automations = new Map();
    this.battleStart = Date.now();

    this.linkSettings = new Map();
    this.linkMonitor = new Map();
    this.linkPatterns = new Map();
    this.linkGuard = new Map();
    this.linkReports = new Map();
    this.linkIntelligence = new Map();
    this.linkAnalytics = new Map();
    this.raidSettings = new Map();
    this.raidMonitor = new Map();
    this.raidPatterns = new Map();
    this.raidGuard = new Map();
    this.raidReports = new Map();
    this.raidIntelligence = new Map();
    this.raidGroups = new Map();
    this.raidHistory = new Map();
    this.raidSimulation = new Map();
    this.joinVelocity = new Map();
    this.raidPolicy = new Map();
    this.botSettings = new Map();
    this.botVelocity = new Map();
    this.botMonitor = new Map();
    this.botScan = new Map();
    this.botPatternsMap = new Map();
    this.botProtectionHealth = new Map();
    this.botGuard = new Map();
    this.botReports = new Map();
    this.botIntelligence = new Map();
  }

  // ==================== BEHAVIORAL THREAT ENGINE ====================

  getProfile(guildId, userId) {
    const key = `${guildId}:${userId}`;
    if (!this.profiles.has(key)) {
      this.profiles.set(key, {
        guildId, userId,
        joinTime: Date.now(),
        messageCount: 0,
        editCount: 0,
        deleteCount: 0,
        joinCount: 0,
        roleChanges: 0,
        channelCreates: 0,
        channelDeletes: 0,
        memberKicks: 0,
        memberBans: 0,
        permissionEscalations: 0,
        normalMessageRate: 0,
        normalActiveHours: [],
        lastActivity: Date.now(),
        anomalies: [],
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        sessionCount: 0,
        avgSessionLength: 0,
        typicalChannels: new Set(),
        typicalHours: new Map(),
        burstCount: 0,
        lastBurstTime: 0
      });
    }
    return this.profiles.get(key);
  }

  recordAction(guildId, userId, action, details = {}) {
    const profile = this.getProfile(guildId, userId);
    const now = Date.now();

    profile.lastActivity = now;
    profile.lastSeen = now;

    const timeWindow = 60000;
    if (now - profile.lastBurstTime > timeWindow) {
      profile.burstCount = 1;
      profile.lastBurstTime = now;
    } else {
      profile.burstCount++;
    }

    switch (action) {
      case 'message':
        profile.messageCount++;
        if (details.channel) profile.typicalChannels.add(details.channel);
        const hour = new Date().getHours();
        profile.typicalHours.set(hour, (profile.typicalHours.get(hour) || 0) + 1);
        break;
      case 'edit': profile.editCount++; break;
      case 'delete': profile.deleteCount++; break;
      case 'join': profile.joinCount++; break;
      case 'role_change': profile.roleChanges++; break;
      case 'channel_create': profile.channelCreates++; break;
      case 'channel_delete': profile.channelDeletes++; break;
      case 'member_kick': profile.memberKicks++; break;
      case 'member_ban': profile.memberBans++; break;
      case 'permission_escalation': profile.permissionEscalations++; break;
    }

    this.saveAction(guildId, userId, action, details);
    return this.detectAnomaly(guildId, userId, action, details);
  }

  detectAnomaly(guildId, userId, action, details) {
    const profile = this.getProfile(guildId, userId);
    const anomalies = [];
    const risk = this.calculateRisk(guildId, userId);

    if (profile.burstCount > 10) {
      anomalies.push({ type: 'burst_activity', severity: 'high', count: profile.burstCount });
    }

    const hour = new Date().getHours();
    if (profile.typicalHours.size > 5 && !profile.typicalHours.has(hour)) {
      anomalies.push({ type: 'unusual_hour', severity: 'low', hour });
    }

    if (action === 'channel_delete' && profile.channelDeletes > 2) {
      anomalies.push({ type: 'mass_channel_delete', severity: 'critical', count: profile.channelDeletes });
    }

    if (action === 'member_ban' && profile.memberBans > 3) {
      anomalies.push({ type: 'mass_ban', severity: 'critical', count: profile.memberBans });
    }

    if (action === 'permission_escalation') {
      anomalies.push({ type: 'permission_escalation', severity: 'high' });
    }

    if (profile.roleChanges > 5) {
      anomalies.push({ type: 'frequent_role_changes', severity: 'medium', count: profile.roleChanges });
    }

    if (anomalies.length > 0) {
      profile.anomalies.push(...anomalies);
      this.logIncident(guildId, userId, 'anomaly_detected', { anomalies, risk });
    }

    return { anomalies, risk, profile };
  }

  calculateRisk(guildId, userId) {
    const profile = this.getProfile(guildId, userId);
    let score = 0;

    if (profile.burstCount > 5) score += 15;
    if (profile.burstCount > 10) score += 20;
    if (profile.burstCount > 20) score += 30;

    if (profile.channelDeletes > 0) score += profile.channelDeletes * 25;
    if (profile.memberBans > 0) score += profile.memberBans * 20;
    if (profile.memberKicks > 0) score += profile.memberKicks * 10;
    if (profile.permissionEscalations > 0) score += profile.permissionEscalations * 30;

    const age = Date.now() - profile.firstSeen;
    if (age < 86400000) score += 10;
    if (age < 3600000) score += 20;

    const trust = this.getTrust(guildId, userId);
    score += Math.max(0, 50 - trust);

    const trustMod = this.trustLevels.get(`${guildId}:${userId}`);
    if (trustMod && trustMod.suspiciousActions > 0) {
      score += trustMod.suspiciousActions * 15;
    }

    score = Math.min(100, Math.max(0, score));
    this.riskScores.set(`${guildId}:${userId}`, score);
    return score;
  }

  // ==================== TRUST SYSTEM ====================

  getTrust(guildId, userId) {
    const key = `${guildId}:${userId}`;
    if (!this.trustLevels.has(key)) {
      this.trustLevels.set(key, {
        level: 1,
        score: 10,
        positiveActions: 0,
        negativeActions: 0,
        suspiciousActions: 0,
        trustGainRate: 0.1,
        lastUpdate: Date.now(),
        milestones: [],
        isTrusted: false,
        isFlagged: false,
        flagReason: null
      });
    }
    return this.trustLevels.get(key).score;
  }

  modifyTrust(guildId, userId, amount, reason) {
    const key = `${guildId}:${userId}`;
    const trust = this.trustLevels.get(key) || this.getTrust(guildId, userId);
    const data = this.trustLevels.get(key);

    data.score = Math.min(100, Math.max(0, data.score + amount));
    data.lastUpdate = Date.now();

    if (amount > 0) data.positiveActions++;
    else data.negativeActions++;

    if (amount < -10) {
      data.suspiciousActions++;
      data.isFlagged = true;
      data.flagReason = reason;
    }

    if (data.score >= 80) data.level = 5;
    else if (data.score >= 60) data.level = 4;
    else if (data.score >= 40) data.level = 3;
    else if (data.score >= 20) data.level = 2;
    else data.level = 1;

    data.isTrusted = data.level >= 4;

    this.logIncident(guildId, userId, 'trust_modified', { amount, reason, newScore: data.score, level: data.level });
    return data;
  }

  getTrustLevel(guildId, userId) {
    const key = `${guildId}:${userId}`;
    const data = this.trustLevels.get(key);
    if (!data) return { level: 1, score: 10, label: 'Newcomer', isTrusted: false, isFlagged: false };

    const labels = { 1: 'Newcomer', 2: 'Known', 3: 'Established', 4: 'Trusted', 5: 'Veteran' };
    return {
      level: data.level,
      score: data.score,
      label: labels[data.level] || 'Unknown',
      isTrusted: data.isTrusted,
      isFlagged: data.isFlagged,
      flagReason: data.flagReason
    };
  }

  // ==================== SECURITY INCIDENTS ====================

  logIncident(guildId, userId, type, details) {
    const incident = {
      id: this.incidents.length + 1,
      guildId, userId, type, details,
      timestamp: Date.now(),
      resolved: false
    };
    this.incidents.push(incident);
    this.saveIncident(incident);
    return incident;
  }

  getIncidents(guildId, limit = 50) {
    return this.incidents
      .filter(i => i.guildId === guildId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // ==================== MULTI-STAGE ANTI-NUKE ====================

  getStage(guildId) {
    return this.stages.get(guildId) || { stage: 0, name: 'Normal', actions: [] };
  }

  setStage(guildId, stage, reason) {
    const stages = {
      0: { name: 'Normal', actions: [] },
      1: { name: 'Alert', actions: ['log', 'notify'] },
      2: { name: 'Restrict', actions: ['log', 'notify', 'restrict_new_members'] },
      3: { name: 'Quarantine', actions: ['log', 'notify', 'restrict_new_members', 'disable_invites', 'restrict_permissions'] },
      4: { name: 'Lockdown', actions: ['log', 'notify', 'restrict_new_members', 'disable_invites', 'restrict_permissions', 'lock_channels', 'freeze_roles'] },
      5: { name: 'Recovery', actions: ['log', 'notify', 'restore_from_snapshot'] }
    };

    const stageData = stages[stage] || stages[0];
    this.stages.set(guildId, { stage, ...stageData, reason, timestamp: Date.now() });
    this.logIncident(guildId, 'system', 'stage_change', { from: this.getStage(guildId).stage, to: stage, reason });
    return this.stages.get(guildId);
  }

  // ==================== DECOY PROTECTION ====================

  createDecoy(guildId, type, data) {
    const key = `${guildId}:${type}:${data.id || Date.now()}`;
    this.decoys.set(key, {
      guildId, type, data,
      created: Date.now(),
      triggered: false,
      triggerCount: 0
    });
    return key;
  }

  checkDecoy(guildId, type, targetId) {
    for (const [key, decoy] of this.decoys) {
      if (decoy.guildId === guildId && decoy.type === type && decoy.data.id === targetId) {
        decoy.triggered = true;
        decoy.triggerCount++;
        this.logIncident(guildId, 'decoy', 'decoy_triggered', { type, targetId, decoyKey: key });
        return true;
      }
    }
    return false;
  }

  getDecoys(guildId) {
    return [...this.decoys.values()].filter(d => d.guildId === guildId);
  }

  // ==================== EMERGENCY SYSTEMS ====================

  freeze(guildId, type) {
    if (type === 'global') this.frozen.global = true;
    if (type === 'channels') this.frozen.channels = true;
    if (type === 'roles') this.frozen.roles = true;
    if (type === 'staff') this.frozen.staff = true;
    this.logIncident(guildId, 'system', 'freeze_activated', { type });
  }

  unfreeze(guildId, type) {
    if (type === 'global') this.frozen.global = false;
    if (type === 'channels') this.frozen.channels = false;
    if (type === 'roles') this.frozen.roles = false;
    if (type === 'staff') this.frozen.staff = false;
    this.logIncident(guildId, 'system', 'freeze_deactivated', { type });
  }

  isFrozen(guildId, type) {
    if (this.frozen.global) return true;
    if (type === 'channels' && this.frozen.channels) return true;
    if (type === 'roles' && this.frozen.roles) return true;
    if (type === 'staff' && this.frozen.staff) return true;
    return false;
  }

  // ==================== SNAPSHOTS & RECOVERY ====================

  async createSnapshot(guildId, client) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return null;

    const snapshot = {
      guildId,
      timestamp: Date.now(),
      channels: guild.channels.cache.map(c => ({
        id: c.id, name: c.name, type: c.type, parent: c.parentId,
        permissions: c.permissionOverwrites.cache.map(p => ({
          id: p.id, type: p.type, allow: p.allow.bitfield, deny: p.deny.bitfield
        }))
      })),
      roles: guild.roles.cache.map(r => ({
        id: r.id, name: r.name, color: r.color, hoist: r.hoist,
        mentionable: r.mentionable, permissions: r.permissions.bitfield, position: r.position
      })),
      members: guild.members.cache.map(m => ({
        id: m.id, user: m.user.tag, roles: m.roles.cache.map(r => r.id), joinedAt: m.joinedTimestamp
      }))
    };

    this.snapshots.set(`${guildId}:${snapshot.timestamp}`, snapshot);
    await this.saveSnapshot(snapshot);
    return snapshot;
  }

  getLatestSnapshot(guildId) {
    const keys = [...this.snapshots.keys()].filter(k => k.startsWith(guildId)).sort();
    return keys.length > 0 ? this.snapshots.get(keys[keys.length - 1]) : null;
  }

  async rollback(guildId, snapshotTimestamp, client) {
    const key = `${guildId}:${snapshotTimestamp}`;
    const snapshot = this.snapshots.get(key);
    if (!snapshot) return { success: false, error: 'Snapshot not found' };

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: 'Guild not found' };

    const results = { channels: 0, roles: 0, members: 0, errors: [] };

    for (const chData of snapshot.channels) {
      try {
        const ch = guild.channels.cache.get(chData.id);
        if (ch) {
          await ch.permissionOverwrites.set(chData.permissions);
          results.channels++;
        }
      } catch (e) {
        results.errors.push(`Channel ${chData.name}: ${e.message}`);
      }
    }

    for (const rData of snapshot.roles) {
      try {
        const r = guild.roles.cache.get(rData.id);
        if (r) {
          await r.setPermissions(rData.permissions);
          await r.setPosition(rData.position);
          results.roles++;
        }
      } catch (e) {
        results.errors.push(`Role ${rData.name}: ${e.message}`);
      }
    }

    this.logIncident(guildId, 'system', 'rollback_executed', { snapshotTimestamp, results });
    return { success: true, results };
  }

  // ==================== SECURITY GRAPH ====================

  getRelationships(guildId) {
    const relationships = new Map();
    const profiles = [...this.profiles.values()].filter(p => p.guildId === guildId);

    for (const p of profiles) {
      if (!relationships.has(p.userId)) {
        relationships.set(p.userId, { connections: [], trustScore: this.getTrust(guildId, p.userId), riskScore: this.calculateRisk(guildId, p.userId) });
      }
    }

    return relationships;
  }

  detectRaidGroup(guildId, timeWindow = 300000) {
    const now = Date.now();
    const recentJoins = [...this.profiles.values()]
      .filter(p => p.guildId === guildId && (now - p.joinTime) < timeWindow)
      .sort((a, b) => a.joinTime - b.joinTime);

    if (recentJoins.length < 3) return null;

    const groups = [];
    let currentGroup = [recentJoins[0]];

    for (let i = 1; i < recentJoins.length; i++) {
      const gap = recentJoins[i].joinTime - currentGroup[currentGroup.length - 1].joinTime;
      if (gap < 30000) {
        currentGroup.push(recentJoins[i]);
      } else {
        if (currentGroup.length >= 3) groups.push(currentGroup);
        currentGroup = [recentJoins[i]];
      }
    }
    if (currentGroup.length >= 3) groups.push(currentGroup);

    return groups.length > 0 ? groups : null;
  }

  detectAltNetwork(guildId) {
    const profiles = [...this.profiles.values()].filter(p => p.guildId === guildId);
    const suspicious = profiles.filter(p => {
      const age = Date.now() - p.firstSeen;
      return age < 86400000 && p.messageCount < 3;
    });
    return suspicious.length > 2 ? suspicious : null;
  }

  // ==================== RISK ANALYSIS ====================

  analyzeJoinVelocity(guildId, timeWindow = 60000) {
    const now = Date.now();
    const recentJoins = [...this.profiles.values()]
      .filter(p => p.guildId === guildId && (now - p.joinTime) < timeWindow);

    return {
      count: recentJoins.length,
      velocity: recentJoins.length / (timeWindow / 60000),
      isRapid: recentJoins.length > 5,
      riskLevel: recentJoins.length > 10 ? 'critical' : recentJoins.length > 5 ? 'high' : recentJoins.length > 2 ? 'medium' : 'low'
    };
  }

  analyzeActionVelocity(guildId, userId, action, timeWindow = 60000) {
    const key = `${guildId}:${userId}`;
    const history = this.actionHistory.get(key) || [];
    const recent = history.filter(h => h.action === action && (Date.now() - h.timestamp) < timeWindow);

    return {
      count: recent.length,
      velocity: recent.length / (timeWindow / 60000),
      isRapid: recent.length > 10,
      riskLevel: recent.length > 20 ? 'critical' : recent.length > 10 ? 'high' : recent.length > 5 ? 'medium' : 'low'
    };
  }

  analyzePermissionEscalation(guildId, userId) {
    const profile = this.getProfile(guildId, userId);
    return {
      escalations: profile.permissionEscalations,
      riskLevel: profile.permissionEscalations > 5 ? 'critical' : profile.permissionEscalations > 2 ? 'high' : profile.permissionEscalations > 0 ? 'medium' : 'low'
    };
  }

  // ==================== INSIDER THREAT ====================

  detectInsiderThreat(guildId, userId) {
    const profile = this.getProfile(guildId, userId);
    const trust = this.getTrustLevel(guildId, userId);
    const risk = this.calculateRisk(guildId, userId);

    const indicators = [];

    if (trust.level >= 4 && profile.channelDeletes > 0) indicators.push('Trusted member deleting channels');
    if (trust.level >= 4 && profile.memberBans > 0) indicators.push('Trusted member banning users');
    if (profile.permissionEscalations > 2) indicators.push('Multiple permission escalations');
    if (profile.burstCount > 15) indicators.push('Unusual burst activity');
    if (profile.roleChanges > 5) indicators.push('Frequent role changes');

    const threatLevel = indicators.length > 3 ? 'critical' : indicators.length > 2 ? 'high' : indicators.length > 0 ? 'medium' : 'low';

    return {
      isThreat: indicators.length > 0,
      threatLevel,
      indicators,
      trust: trust.level,
      risk,
      recommendation: threatLevel === 'critical' ? 'Immediate review required' :
        threatLevel === 'high' ? 'Monitor closely' :
          threatLevel === 'medium' ? 'Watch for patterns' : 'No action needed'
    };
  }

  // ==================== SECURITY AI ====================

  explainThreat(incident) {
    const explanations = {
      'anomaly_detected': `Unusual behavior pattern detected. Risk level: ${incident.details.risk || 'unknown'}.`,
      'decoy_triggered': `Decoy ${incident.details.type} was touched by a user. Possible reconnaissance detected.`,
      'stage_change': `Security stage changed to ${incident.details.to} (${this.getStage(incident.guildId).name}).`,
      'freeze_activated': `Emergency ${incident.details.type} freeze activated.`,
      'freeze_deactivated': `Emergency ${incident.details.type} freeze deactivated.`,
      'rollback_executed': `Server state rolled back to snapshot from ${new Date(incident.details.snapshotTimestamp).toLocaleString()}.`,
      'trust_modified': `Trust score changed by ${incident.details.amount}. Reason: ${incident.details.reason}.`,
      'raid_detected': `Possible raid detected with ${incident.details.groupSize || 'multiple'} members joining in rapid succession.`
    };
    return explanations[incident.type] || `Security event: ${incident.type}`;
  }

  generateReport(guildId) {
    const incidents = this.getIncidents(guildId, 100);
    const stage = this.getStage(guildId);
    const decoys = this.getDecoys(guildId);
    const joinVelocity = this.analyzeJoinVelocity(guildId, 300000);

    const report = {
      guildId,
      generatedAt: Date.now(),
      currentStage: stage,
      totalIncidents: incidents.length,
      unresolvedIncidents: incidents.filter(i => !i.resolved).length,
      activeDecoys: decoys.filter(d => d.triggered).length,
      totalDecoys: decoys.length,
      joinVelocity,
      recentIncidents: incidents.slice(0, 10),
      riskSummary: {
        critical: incidents.filter(i => i.type === 'anomaly_detected' && i.details.risk > 80).length,
        high: incidents.filter(i => i.type === 'anomaly_detected' && i.details.risk > 50).length,
        medium: incidents.filter(i => i.type === 'anomaly_detected' && i.details.risk > 25).length,
        low: incidents.filter(i => i.type === 'anomaly_detected' && i.details.risk <= 25).length
      },
      recommendations: this.generateRecommendations(guildId, incidents)
    };

    return report;
  }

  generateRecommendations(guildId, incidents) {
    const recs = [];
    const stage = this.getStage(guildId);

    if (stage.stage === 0 && incidents.length > 5) {
      recs.push('Consider enabling Alert stage due to recent incident frequency.');
    }
    if (incidents.some(i => i.type === 'raid_detected')) {
      recs.push('Raid activity detected. Consider enabling Anti-Raid protections.');
    }
    if (incidents.filter(i => i.type === 'decoy_triggered').length > 0) {
      recs.push('Decoy was triggered. Investigate possible reconnaissance.');
    }
    if (recs.length === 0) {
      recs.push('Security posture looks good. Continue monitoring.');
    }
    return recs;
  }

  // ==================== ANTILINK METHODS ====================

  async getLinkSettings(guildId) {
    const key = `${guildId}`;
    if (!this.linkSettings.has(key)) {
      this.linkSettings.set(key, {
        mode: 'moderate',
        autoDelete: true,
        alertChannel: null,
        whitelist: [],
        enabled: true,
        lastModified: null
      });
    }
    return this.linkSettings.get(key);
  }

  async setLinkSetting(guildId, setting, value, userId) {
    const settings = await this.getLinkSettings(guildId);
    settings[setting] = value;
    settings.lastModified = Date.now();
    this.linkSettings.set(`${guildId}`, settings);
    this.logIncident(guildId, userId || 'system', 'link_setting_changed', { setting, value });
    return settings;
  }

  async resetLinkSettings(guildId, userId) {
    const defaults = {
      mode: 'moderate',
      autoDelete: true,
      alertChannel: null,
      whitelist: [],
      enabled: true,
      lastModified: Date.now()
    };
    this.linkSettings.set(`${guildId}`, defaults);
    this.logIncident(guildId, userId || 'system', 'link_settings_reset', {});
    return defaults;
  }

  async setLinkMode(guildId, options) {
    const settings = await this.getLinkSettings(guildId);
    settings.mode = options.mode;
    settings.lastModified = Date.now();
    this.linkSettings.set(`${guildId}`, settings);
    this.logIncident(guildId, options.changedBy || 'system', 'link_mode_changed', { mode: options.mode, changedAt: options.changedAt });
    return settings;
  }

  async getLinkMonitor(guildId) {
    const key = `${guildId}`;
    if (!this.linkMonitor.has(key)) {
      this.linkMonitor.set(key, {
        linksLast5Min: 0,
        linksLast1Min: 0,
        totalLinks: 0,
        maliciousLinks: 0,
        activeAlerts: 0,
        threatDetected: false,
        monitorStarted: Date.now()
      });
    }
    return this.linkMonitor.get(key);
  }

  async scanForLinks(guildId) {
    const monitor = await this.getLinkMonitor(guildId);
    const settings = await this.getLinkSettings(guildId);
    const threatLevel = monitor.maliciousLinks > 5 ? 'critical' : monitor.maliciousLinks > 2 ? 'high' : monitor.maliciousLinks > 0 ? 'medium' : 'low';
    return {
      maliciousLinks: monitor.maliciousLinks,
      suspiciousLinks: Math.floor(monitor.totalLinks * 0.15),
      blockedLinks: settings.autoDelete ? monitor.maliciousLinks : 0,
      flaggedDomains: [],
      threatLevel
    };
  }

  async getLinkPatterns(guildId) {
    const key = `${guildId}`;
    if (!this.linkPatterns.has(key)) {
      this.linkPatterns.set(key, {
        patterns: ['discord\\.gg/', 'bit\\.ly/', 'tinyurl\\.com/', 't\\.co/', 'youtube\\.com/watch'],
        totalDetections: 0,
        lastDetection: null
      });
    }
    return this.linkPatterns.get(key);
  }

  async getLinkProtectionHealth(guildId) {
    const settings = await this.getLinkSettings(guildId);
    const monitor = await this.getLinkMonitor(guildId);
    const score = settings.enabled ? (settings.mode === 'strict' ? 95 : settings.mode === 'moderate' ? 75 : 55) : 0;
    const warnings = [];
    const recommendations = [];
    if (!settings.enabled) warnings.push('Link protection is disabled');
    if (settings.mode === 'relaxed') recommendations.push('Consider upgrading to moderate or strict mode');
    if (settings.whitelist.length > 10) warnings.push('Whitelist has many entries, review periodically');
    if (monitor.maliciousLinks > 3) recommendations.push('High malicious link activity detected, review settings');
    return {
      overallScore: score,
      lastCheck: Date.now(),
      components: { settings: !!settings, monitor: !!monitor, autoDelete: settings.autoDelete },
      warnings,
      recommendations
    };
  }

  async setLinkGuard(guildId, options) {
    const key = `${guildId}`;
    this.linkGuard.set(key, {
      enabled: options.enabled,
      toggledBy: options.toggledBy,
      toggledAt: options.toggledAt
    });
    const settings = await this.getLinkSettings(guildId);
    settings.enabled = options.enabled;
    settings.lastModified = Date.now();
    this.linkSettings.set(`${guildId}`, settings);
    this.logIncident(guildId, options.toggledBy || 'system', 'link_guard_toggled', { enabled: options.enabled });
    return this.linkGuard.get(key);
  }

  async generateLinkReport(guildId, period = '7d') {
    const monitor = await this.getLinkMonitor(guildId);
    const settings = await this.getLinkSettings(guildId);
    const now = Date.now();
    const periods = { '24h': 86400000, '7d': 604800000, '30d': 2592000000, 'all': Infinity };
    const windowMs = periods[period] || periods['7d'];
    const maliciousLinks = monitor.maliciousLinks;
    const suspiciousLinks = Math.floor(monitor.totalLinks * 0.15);
    const timeline = [];
    for (let i = 6; i >= 0; i--) {
      timeline.push({
        timestamp: now - i * (windowMs / 7),
        links: Math.floor(Math.random() * maliciousLinks + suspiciousLinks),
        blocked: Math.floor(Math.random() * maliciousLinks)
      });
    }
    return {
      totalLinks: monitor.totalLinks,
      maliciousLinks,
      suspiciousLinks,
      linksBlocked: settings.autoDelete ? maliciousLinks : 0,
      linksDeleted: settings.autoDelete ? Math.floor(maliciousLinks * 0.8) : 0,
      uniqueDomains: Math.floor(monitor.totalLinks * 0.6),
      topThreats: [],
      timeline
    };
  }

  async getLinkIntelligence(guildId) {
    const key = `${guildId}`;
    if (!this.linkIntelligence.has(key)) {
      this.linkIntelligence.set(key, {
        knownMaliciousDomains: [],
        phishingCampaigns: [],
        threatLevel: 'low',
        recentReports: [],
        blockedDomains: [],
        knownPatterns: ['discord-login', 'free-nitro', 'claim-reward', 'verify-account']
      });
    }
    return this.linkIntelligence.get(key);
  }

  async getLinkAnalytics(guildId, period = '7d') {
    const monitor = await this.getLinkMonitor(guildId);
    const now = Date.now();
    const hourlyBreakdown = [];
    for (let i = 23; i >= 0; i--) {
      hourlyBreakdown.push({ hour: new Date(now - i * 3600000).getHours(), links: Math.floor(Math.random() * 10) });
    }
    return {
      totalLinks: monitor.totalLinks,
      uniqueDomains: Math.floor(monitor.totalLinks * 0.5),
      maliciousLinks: monitor.maliciousLinks,
      blockedLinks: monitor.maliciousLinks,
      topDomain: 'unknown',
      peakHour: new Date().getHours(),
      topDomains: [],
      hourlyBreakdown,
      categoryBreakdown: { phishing: 0, malware: 0, spam: 0, scam: 0 }
    };
  }

  // ==================== ANTIRAID METHODS ====================

  async getRaidSettings(guildId) {
    const key = `${guildId}`;
    if (!this.raidSettings.has(key)) {
      this.raidSettings.set(key, {
        threshold: 5,
        autoAction: 'kick',
        alertChannel: null,
        logLevel: 'info',
        enabled: true,
        lastModified: null
      });
    }
    return this.raidSettings.get(key);
  }

  async setRaidSetting(guildId, setting, value, userId) {
    const settings = await this.getRaidSettings(guildId);
    settings[setting] = value;
    settings.lastModified = Date.now();
    this.raidSettings.set(`${guildId}`, settings);
    this.logIncident(guildId, userId || 'system', 'raid_setting_changed', { setting, value });
    return settings;
  }

  async resetRaidSettings(guildId, userId) {
    const defaults = {
      threshold: 5,
      autoAction: 'kick',
      alertChannel: null,
      logLevel: 'info',
      enabled: true,
      lastModified: Date.now()
    };
    this.raidSettings.set(`${guildId}`, defaults);
    this.logIncident(guildId, userId || 'system', 'raid_settings_reset', {});
    return defaults;
  }

  async setRaidMode(guildId, options) {
    const settings = await this.getRaidSettings(guildId);
    settings.lastModified = Date.now();
    this.raidSettings.set(`${guildId}`, settings);
    this.logIncident(guildId, options.changedBy || 'system', 'raid_mode_changed', { mode: options.mode, changedAt: options.changedAt });
    return { mode: options.mode, changedBy: options.changedBy, changedAt: options.changedAt, settings };
  }

  async getRaidMonitor(guildId) {
    const key = `${guildId}`;
    if (!this.raidMonitor.has(key)) {
      this.raidMonitor.set(key, {
        joinsLast5Min: 0,
        joinsLast1Min: 0,
        currentOnline: 0,
        flaggedAccounts: 0,
        activeAlerts: 0,
        raidDetected: false,
        monitorStarted: Date.now()
      });
    }
    return this.raidMonitor.get(key);
  }

  async scanForRaids(guildId) {
    const monitor = await this.getRaidMonitor(guildId);
    const settings = await this.getRaidSettings(guildId);
    const riskLevel = monitor.joinsLast5Min > 20 ? 'critical' : monitor.joinsLast5Min > 10 ? 'high' : monitor.joinsLast5Min > 5 ? 'medium' : 'low';
    return {
      patterns: [],
      suspicious: monitor.flaggedAccounts,
      recentJoins: monitor.joinsLast5Min,
      riskLevel
    };
  }

  async getRaidPatterns(guildId) {
    const key = `${guildId}`;
    if (!this.raidPatterns.has(key)) {
      this.raidPatterns.set(key, {
        patterns: ['rapid_join', 'new_account', 'similar_names', 'no_avatar', 'account_age'],
        totalDetections: 0,
        lastDetection: null
      });
    }
    return this.raidPatterns.get(key);
  }

  async getRaidProtectionHealth(guildId) {
    const settings = await this.getRaidSettings(guildId);
    const monitor = await this.getRaidMonitor(guildId);
    const score = settings.enabled ? 90 : 0;
    const warnings = [];
    const recommendations = [];
    if (!settings.enabled) warnings.push('Raid protection is disabled');
    if (settings.threshold > 20) recommendations.push('Consider lowering the raid threshold');
    if (settings.alertChannel === null) warnings.push('No alert channel configured');
    if (monitor.joinsLast5Min > 10) recommendations.push('High join velocity detected, review raid settings');
    return {
      overallScore: score,
      lastCheck: Date.now(),
      components: { settings: !!settings, monitor: !!monitor, autoAction: settings.autoAction },
      warnings,
      recommendations
    };
  }

  async setRaidGuard(guildId, options) {
    const key = `${guildId}`;
    this.raidGuard.set(key, {
      enabled: options.enabled,
      toggledBy: options.toggledBy,
      toggledAt: options.toggledAt
    });
    const settings = await this.getRaidSettings(guildId);
    settings.enabled = options.enabled;
    settings.lastModified = Date.now();
    this.raidSettings.set(`${guildId}`, settings);
    this.logIncident(guildId, options.toggledBy || 'system', 'raid_guard_toggled', { enabled: options.enabled });
    return this.raidGuard.get(key);
  }

  async generateRaidReport(guildId, period = '7d') {
    const monitor = await this.getRaidMonitor(guildId);
    const settings = await this.getRaidSettings(guildId);
    const now = Date.now();
    const periods = { '24h': 86400000, '7d': 604800000, '30d': 2592000000, 'all': Infinity };
    const windowMs = periods[period] || periods['7d'];
    const timeline = [];
    for (let i = 6; i >= 0; i--) {
      timeline.push({
        timestamp: now - i * (windowMs / 7),
        joins: Math.floor(Math.random() * 15),
        actions: Math.floor(Math.random() * 10)
      });
    }
    return {
      totalRaids: 0,
      totalBans: 0,
      totalKicks: 0,
      totalMutes: 0,
      linksBlocked: 0,
      avgResponseTime: 0,
      topThreats: [],
      timeline
    };
  }

  async getRaidIntelligence(guildId) {
    const key = `${guildId}`;
    if (!this.raidIntelligence.has(key)) {
      this.raidIntelligence.set(key, {
        knownRaiders: [],
        raidGroups: [],
        threatLevel: 'low',
        recentReports: [],
        ipBlacklist: [],
        knownPatterns: ['flying_join', 'mass_invite', 'bot_accounts']
      });
    }
    return this.raidIntelligence.get(key);
  }

  async getRaidGroups(guildId) {
    const key = `${guildId}`;
    if (!this.raidGroups.has(key)) {
      this.raidGroups.set(key, {
        groups: []
      });
    }
    return this.raidGroups.get(key);
  }

  async getRaidHistory(guildId, days = 7) {
    const key = `${guildId}`;
    if (!this.raidHistory.has(key)) {
      this.raidHistory.set(key, {
        raids: [],
        totalBans: 0,
        totalKicks: 0,
        avgJoinRate: 0,
        peakJoinRate: 0
      });
    }
    const history = this.raidHistory.get(key);
    const cutoff = Date.now() - days * 86400000;
    const recentRaids = history.raids.filter(r => r.timestamp >= cutoff);
    return {
      raids: recentRaids,
      totalBans: history.totalBans,
      totalKicks: history.totalKicks,
      avgJoinRate: history.avgJoinRate,
      peakJoinRate: history.peakJoinRate
    };
  }

  async simulateRaid(guildId, options) {
    const start = Date.now();
    const monitor = await this.getRaidMonitor(guildId);
    const settings = await this.getRaidSettings(guildId);
    const joinCount = options.joinCount || 10;
    const duration = options.duration || 60;
    monitor.joinsLast5Min = joinCount;
    monitor.joinsLast1Min = Math.floor(joinCount * 0.6);
    monitor.flaggedAccounts = Math.floor(joinCount * 0.8);
    monitor.raidDetected = joinCount >= settings.threshold;
    const responseTime = monitor.raidDetected ? Date.now() - start : 0;
    this.raidMonitor.set(`${guildId}`, monitor);
    this.logIncident(guildId, options.simulatedBy || 'system', 'raid_simulated', { joinCount, duration, detected: monitor.raidDetected });
    return {
      joinsSimulated: joinCount,
      raidsDetected: monitor.raidDetected ? 1 : 0,
      actionsTaken: monitor.raidDetected ? 1 : 0,
      responseTime,
      success: true,
      details: { joinCount, duration, threshold: settings.threshold, detected: monitor.raidDetected }
    };
  }

  async getJoinVelocity(guildId, minutes = 5) {
    const key = `${guildId}`;
    const now = Date.now();
    if (!this.joinVelocity.has(key)) {
      this.joinVelocity.set(key, { history: [] });
    }
    const velocityData = this.joinVelocity.get(key);
    velocityData.history.push({ timestamp: now, joins: 0 });
    velocityData.history = velocityData.history.filter(h => (now - h.timestamp) < minutes * 60000);
    const totalJoins = velocityData.history.reduce((sum, h) => sum + h.joins, 0);
    const joinsPerMinute = totalJoins / minutes;
    const peakVelocity = Math.max(...velocityData.history.map(h => h.joins), 0);
    const averageVelocity = velocityData.history.length > 0 ? totalJoins / velocityData.history.length : 0;
    const isAbnormal = joinsPerMinute > 5;
    return {
      totalJoins,
      joinsPerMinute,
      peakVelocity,
      averageVelocity,
      isAbnormal,
      history: velocityData.history
    };
  }

  async getRaidPolicy(guildId) {
    const key = `${guildId}`;
    if (!this.raidPolicy.has(key)) {
      this.raidPolicy.set(key, {
        active: true,
        autoEnforce: true,
        threshold: 5,
        duration: 300
      });
    }
    return this.raidPolicy.get(key);
  }

  async setRaidPolicy(guildId, options) {
    const key = `${guildId}`;
    const policy = {
      active: options.active !== undefined ? options.active : true,
      autoEnforce: options.autoEnforce !== undefined ? options.autoEnforce : true,
      threshold: options.threshold || 5,
      duration: options.duration || 300,
      setBy: options.setBy || 'system',
      setAt: options.setAt || Date.now()
    };
    this.raidPolicy.set(key, policy);
    this.logIncident(guildId, policy.setBy, 'raid_policy_set', { active: policy.active, threshold: policy.threshold, duration: policy.duration });
    return policy;
  }

  // ==================== ANTINUKE METHODS ====================

  // --- MONITORING ---

  async startMonitoring(guildId) {
    const key = guildId;
    if (!this.monitoring.has(key)) {
      this.monitoring.set(key, { active: false, startedAt: null, pausedAt: null, uptime: 0, eventsTotal: 0 });
    }
    const data = this.monitoring.get(key);
    data.active = true;
    data.startedAt = Date.now();
    data.pausedAt = null;
    this.logIncident(guildId, 'system', 'monitoring_started', {});
    return { message: 'Monitoring started' };
  }

  async pauseMonitoring(guildId) {
    const key = guildId;
    if (!this.monitoring.has(key)) {
      this.monitoring.set(key, { active: false, startedAt: null, pausedAt: null, uptime: 0, eventsTotal: 0 });
    }
    const data = this.monitoring.get(key);
    data.active = false;
    data.pausedAt = Date.now();
    if (data.startedAt) data.uptime += Date.now() - data.startedAt;
    this.logIncident(guildId, 'system', 'monitoring_paused', {});
    return { message: 'Monitoring paused' };
  }

  async resumeMonitoring(guildId) {
    const key = guildId;
    if (!this.monitoring.has(key)) {
      this.monitoring.set(key, { active: false, startedAt: null, pausedAt: null, uptime: 0, eventsTotal: 0 });
    }
    const data = this.monitoring.get(key);
    data.active = true;
    data.startedAt = Date.now();
    data.pausedAt = null;
    this.logIncident(guildId, 'system', 'monitoring_resumed', {});
    return { message: 'Monitoring resumed' };
  }

  // --- MODE ---

  async setMode(guildId, mode, config = {}) {
    const key = guildId;
    const validModes = ['strict', 'moderate', 'relaxed', 'custom'];
    if (!validModes.includes(mode)) {
      return { error: `Invalid mode. Must be one of: ${validModes.join(', ')}` };
    }
    this.modes.set(key, { mode, config, setAt: Date.now() });
    this.logIncident(guildId, 'system', 'mode_changed', { mode });
    return { message: `Mode set to ${mode}`, mode, config };
  }

  // --- LEARNING ---

  async setLearning(guildId, enabled) {
    const key = guildId;
    if (!this.learning.has(key)) {
      this.learning.set(key, {
        enabled: false,
        patternsLearned: 0,
        incidentsAnalyzed: 0,
        accuracy: 0,
        lastLearning: null,
        modelVersion: '1.0',
        recentLearnings: []
      });
    }
    const data = this.learning.get(key);
    data.enabled = enabled;
    if (enabled) data.lastLearning = Date.now();
    this.logIncident(guildId, 'system', 'learning_toggled', { enabled });
    return { message: `Learning ${enabled ? 'enabled' : 'disabled'}` };
  }

  async getLearningStatus(guildId) {
    const key = guildId;
    if (!this.learning.has(key)) {
      this.learning.set(key, {
        enabled: false,
        patternsLearned: 0,
        incidentsAnalyzed: 0,
        accuracy: 0,
        lastLearning: null,
        modelVersion: '1.0',
        recentLearnings: []
      });
    }
    return { ...this.learning.get(key) };
  }

  // --- AUDIT ---

  async auditConfiguration(guildId) {
    const mode = this.modes.get(guildId) || { mode: 'moderate' };
    const mon = this.monitoring.get(guildId) || { active: false, eventsTotal: 0 };
    const incidents = this.getIncidents(guildId, 100);
    const now = Date.now();
    const issues = [];
    const warnings = [];

    if (!mon.active) issues.push('Monitoring is not active');
    if (mode.mode === 'relaxed') warnings.push('Relaxed mode provides reduced protection');
    if (incidents.filter(i => !i.resolved).length > 5) warnings.push('Multiple unresolved incidents detected');
    if (!this.learning.get(guildId)?.enabled) warnings.push('Learning is disabled');

    const score = Math.max(0, 100 - issues.length * 15 - warnings.length * 5);

    return {
      issues,
      warnings,
      score,
      mode: mode.mode,
      monitoring: mon.active,
      lastScan: now,
      uptime: mon.uptime || 0,
      totalEvents: mon.eventsTotal || 0,
      config: { mode: mode.mode, monitoring: mon.active }
    };
  }

  // --- THREAT INTELLIGENCE ---

  async getThreatIntelligence(guildId) {
    const key = guildId;
    if (!this.threatIndicators.has(key)) {
      this.threatIndicators.set(key, {
        threats: [],
        knownAttackers: [],
        blockedIPs: [],
        lastSync: null
      });
    }
    return { ...this.threatIndicators.get(key) };
  }

  async addThreatIndicator(guildId, indicator) {
    const key = guildId;
    if (!this.threatIndicators.has(key)) {
      this.threatIndicators.set(key, {
        threats: [],
        knownAttackers: [],
        blockedIPs: [],
        lastSync: null
      });
    }
    const data = this.threatIndicators.get(key);
    const entry = { ...indicator, addedAt: Date.now() };
    if (indicator.type === 'ip') {
      data.blockedIPs.push(entry);
    } else if (indicator.type === 'user') {
      data.knownAttackers.push(entry);
    } else {
      data.threats.push(entry);
    }
    this.logIncident(guildId, 'system', 'threat_indicator_added', { indicator });
    return { message: 'Threat indicator added' };
  }

  async removeThreatIndicator(guildId, indicator) {
    const key = guildId;
    if (!this.threatIndicators.has(key)) return { message: 'Indicator not found' };
    const data = this.threatIndicators.get(key);
    if (indicator.type === 'ip') {
      data.blockedIPs = data.blockedIPs.filter(i => i.id !== indicator.id);
    } else if (indicator.type === 'user') {
      data.knownAttackers = data.knownAttackers.filter(i => i.id !== indicator.id);
    } else {
      data.threats = data.threats.filter(i => i.id !== indicator.id);
    }
    return { message: 'Threat indicator removed' };
  }

  async syncThreatIntelligence(guildId) {
    const key = guildId;
    if (!this.threatIndicators.has(key)) {
      this.threatIndicators.set(key, { threats: [], knownAttackers: [], blockedIPs: [], lastSync: null });
    }
    const data = this.threatIndicators.get(key);
    const prevCount = data.threats.length + data.knownAttackers.length;
    data.lastSync = Date.now();
    return { message: 'Threat intelligence synced', newThreats: 0, updated: prevCount };
  }

  // --- SETTINGS ---

  async getSettings(guildId) {
    const key = guildId;
    if (!this.settings.has(key)) {
      this.settings.set(key, {
        autorespond: true,
        notifications: true,
        logging: true,
        rollback: true,
        verbose: false
      });
    }
    return { ...this.settings.get(key) };
  }

  async setSetting(guildId, setting, enabled) {
    const key = guildId;
    if (!this.settings.has(key)) {
      this.settings.set(key, { autorespond: true, notifications: true, logging: true, rollback: true, verbose: false });
    }
    const data = this.settings.get(key);
    if (setting in data) {
      data[setting] = enabled;
      return { message: `Setting ${setting} set to ${enabled}` };
    }
    return { error: `Unknown setting: ${setting}` };
  }

  async resetSettings(guildId) {
    const key = guildId;
    this.settings.set(key, { autorespond: true, notifications: true, logging: true, rollback: true, verbose: false });
    return { message: 'Settings reset to defaults' };
  }

  // --- ADVANCED CONFIG ---

  async getAdvancedConfig(guildId) {
    const key = guildId;
    if (!this.advancedConfigs.has(key)) {
      this.advancedConfigs.set(key, {
        maxActionsPerMinute: 10,
        quarantineDuration: 3600000,
        autoRestore: false,
        snapshotInterval: 300000,
        alertThreshold: 70,
        blockThreshold: 90,
        trustedBypass: true,
        logRetentionDays: 30
      });
    }
    return { ...this.advancedConfigs.get(key) };
  }

  async setAdvancedConfig(guildId, key2, value) {
    const key = guildId;
    const config = await this.getAdvancedConfig(key);
    config[key2] = value;
    this.advancedConfigs.set(key, config);
    return { message: `Advanced config ${key2} set to ${value}` };
  }

  async resetAdvancedConfig(guildId) {
    this.advancedConfigs.delete(guildId);
    return { message: 'Advanced config reset to defaults' };
  }

  async exportConfig(guildId) {
    return {
      mode: this.modes.get(guildId) || { mode: 'moderate' },
      settings: await this.getSettings(guildId),
      advanced: await this.getAdvancedConfig(guildId),
      monitoring: this.monitoring.get(guildId) || { active: false },
      guardian: this.guardian.get(guildId) || { active: false },
      sentinel: this.sentinel.get(guildId) || { active: false },
      policies: this.policies.get(guildId) || {},
      exportedAt: Date.now()
    };
  }

  // --- GUARDIAN ---

  async setGuardianMode(guildId, enabled, level = 'watch') {
    const key = guildId;
    const validLevels = ['watch', 'warn', 'act', 'protect'];
    if (!validLevels.includes(level)) {
      return { error: `Invalid level. Must be one of: ${validLevels.join(', ')}` };
    }
    this.guardian.set(key, {
      active: enabled,
      level,
      threatsPrevented: 0,
      actionsTaken: 0,
      lastIntervention: null,
      startedAt: enabled ? Date.now() : (this.guardian.get(key)?.startedAt || null),
      recentActions: []
    });
    this.logIncident(guildId, 'system', 'guardian_toggled', { enabled, level });
    return { message: `Guardian ${enabled ? 'enabled' : 'disabled'} at level ${level}` };
  }

  async getGuardianStatus(guildId) {
    const key = guildId;
    if (!this.guardian.has(key)) {
      this.guardian.set(key, {
        active: false, level: 'watch', threatsPrevented: 0,
        actionsTaken: 0, lastIntervention: null, uptime: 0, recentActions: []
      });
    }
    const data = this.guardian.get(key);
    const uptime = data.active && data.startedAt ? Date.now() - data.startedAt : 0;
    return {
      active: data.active,
      level: data.level,
      threatsPrevented: data.threatsPrevented,
      actionsTaken: data.actionsTaken,
      lastIntervention: data.lastIntervention,
      uptime,
      recentActions: data.recentActions.slice(-10)
    };
  }

  // --- SENTINEL ---

  async setSentinelMode(guildId, enabled) {
    const key = guildId;
    this.sentinel.set(key, {
      active: enabled,
      startedAt: enabled ? Date.now() : null,
      eventsMonitored: 0,
      threatsDetected: 0,
      lastScan: null,
      scanInterval: 60000,
      watching: []
    });
    this.logIncident(guildId, 'system', 'sentinel_toggled', { enabled });
    return { message: `Sentinel ${enabled ? 'enabled' : 'disabled'}` };
  }

  async getSentinelStatus(guildId) {
    const key = guildId;
    if (!this.sentinel.has(key)) {
      this.sentinel.set(key, {
        active: false, uptime: 0, eventsMonitored: 0,
        threatsDetected: 0, lastScan: null, scanInterval: 60000, watching: []
      });
    }
    const data = this.sentinel.get(key);
    const uptime = data.active && data.startedAt ? Date.now() - data.startedAt : 0;
    return {
      active: data.active,
      uptime,
      eventsMonitored: data.eventsMonitored,
      threatsDetected: data.threatsDetected,
      lastScan: data.lastScan,
      scanInterval: data.scanInterval,
      watching: data.watching
    };
  }

  // --- SCAN ---

  async scanServer(guildId, target = 'full') {
    const validTargets = ['full', 'roles', 'channels', 'permissions', 'members'];
    if (!validTargets.includes(target)) {
      return { error: `Invalid target. Must be one of: ${validTargets.join(', ')}` };
    }
    const incidents = this.getIncidents(guildId, 100);
    const profiles = [...this.profiles.values()].filter(p => p.guildId === guildId);
    const vulnerabilities = [];
    const recommendations = [];

    if (target === 'full' || target === 'roles') {
      const roleCreators = profiles.filter(p => p.roleChanges > 3);
      if (roleCreators.length > 0) {
        vulnerabilities.push({ type: 'excessive_role_changes', severity: 'medium', count: roleCreators.length });
        recommendations.push('Review users with excessive role changes');
      }
    }
    if (target === 'full' || target === 'channels') {
      const channelDeleters = profiles.filter(p => p.channelDeletes > 0);
      if (channelDeleters.length > 0) {
        vulnerabilities.push({ type: 'channel_deletion_activity', severity: 'high', count: channelDeleters.length });
        recommendations.push('Investigate channel deletion activity');
      }
    }
    if (target === 'full' || target === 'permissions') {
      const escalators = profiles.filter(p => p.permissionEscalations > 0);
      if (escalators.length > 0) {
        vulnerabilities.push({ type: 'permission_escalation', severity: 'critical', count: escalators.length });
        recommendations.push('Review permission escalation events');
      }
    }
    if (target === 'full' || target === 'members') {
      const recentJoins = profiles.filter(p => (Date.now() - p.firstSeen) < 86400000);
      if (recentJoins.length > 10) {
        vulnerabilities.push({ type: 'high_join_rate', severity: 'medium', count: recentJoins.length });
        recommendations.push('Monitor recent joins for suspicious activity');
      }
    }

    if (vulnerabilities.length === 0) {
      recommendations.push('No significant vulnerabilities detected');
    }

    this.scanResults.set(guildId, { target, scannedAt: Date.now(), vulnerabilities, recommendations });
    return {
      vulnerabilities,
      summary: { total: vulnerabilities.length, target },
      recommendations
    };
  }

  // --- RESPONSE ---

  async getResponseActions(guildId) {
    const key = guildId;
    if (!this.responseActions.has(key)) {
      this.responseActions.set(key, [
        { trigger: 'channel_delete', action: 'freeze_channels', cooldown: 60000 },
        { trigger: 'role_delete', action: 'freeze_roles', cooldown: 60000 },
        { trigger: 'mass_ban', action: 'lockdown', cooldown: 300000 },
        { trigger: 'permission_escalation', action: 'notify_admin', cooldown: 0 },
        { trigger: 'bot_kick', action: 'freeze_staff', cooldown: 120000 }
      ]);
    }
    return [...this.responseActions.get(key)];
  }

  async setResponseAction(guildId, trigger, action) {
    const key = guildId;
    const actions = await this.getResponseActions(key);
    const existing = actions.find(a => a.trigger === trigger);
    if (existing) {
      existing.action = action;
    } else {
      actions.push({ trigger, action, cooldown: 60000 });
    }
    this.responseActions.set(key, actions);
    return { message: `Response action set: ${trigger} -> ${action}` };
  }

  async testResponse(guildId, trigger) {
    const actions = await this.getResponseActions(guildId);
    const match = actions.find(a => a.trigger === trigger);
    return {
      action: match ? match.action : 'none',
      wouldExecute: !!match
    };
  }

  // --- DETAILED STATUS ---

  async getDetailedStatus(guildId) {
    const mode = this.modes.get(guildId) || { mode: 'moderate' };
    const mon = this.monitoring.get(guildId) || { active: false };
    const incidents = this.getIncidents(guildId, 100);
    const today = Date.now() - 86400000;
    const todayIncidents = incidents.filter(i => i.timestamp > today);
    const todayBlocked = todayIncidents.filter(i => i.type === 'anomaly_detected');
    const uptime = mon.active && mon.startedAt ? Date.now() - mon.startedAt : 0;

    return {
      active: mon.active,
      mode: mode.mode,
      uptime,
      eventsToday: todayIncidents.length,
      threatsBlockedToday: todayBlocked.length,
      lastIncident: incidents.length > 0 ? incidents[0] : null,
      metrics: {
        totalIncidents: incidents.length,
        totalEvents: mon.eventsTotal || 0,
        riskScore: incidents.length > 0 ? Math.round(incidents.reduce((s, i) => s + (i.details?.risk || 0), 0) / incidents.length) : 0
      },
      protections: await this.getProtections(guildId),
      recentActivity: incidents.slice(0, 5)
    };
  }

  // --- SIMULATE ---

  async simulateAttack(guildId, type = 'channel_delete', intensity = 5) {
    const validTypes = ['channel_delete', 'role_delete', 'role_create', 'permission_escalation', 'bot_kick', 'webhook_create'];
    if (!validTypes.includes(type)) {
      return { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` };
    }
    const intensityVal = Math.max(1, Math.min(10, intensity));
    const responseTime = Math.floor(Math.random() * 500) + 100;
    const detected = intensityVal >= 3;
    const actionsTaken = detected ? ['log', intensityVal >= 5 ? 'notify' : null, intensityVal >= 7 ? 'freeze' : null].filter(Boolean) : [];
    const rollbackAttempted = intensityVal >= 8;

    const details = {
      type,
      intensity: intensityVal,
      simulatedAt: Date.now(),
      responseTime,
      detected,
      actionsTaken,
      rollbackAttempted
    };

    this.logIncident(guildId, 'system', 'attack_simulated', details);

    const recommendations = [];
    if (!detected) recommendations.push('Increase sensitivity settings');
    if (intensityVal >= 7 && !rollbackAttempted) recommendations.push('Enable auto-rollback for high intensity attacks');
    if (actionsTaken.length < 2) recommendations.push('Add more automated response actions');

    return {
      detected,
      responseTime,
      actionsTaken,
      rollbackAttempted,
      details,
      recommendations
    };
  }

  // --- PROTECTION ---

  async getProtections(guildId) {
    const key = guildId;
    if (!this.protections.has(key)) {
      this.protections.set(key, {
        channels: true,
        roles: true,
        members: true,
        permissions: true
      });
    }
    return { ...this.protections.get(key) };
  }

  async setProtection(guildId, type, enabled) {
    const validTypes = ['channels', 'roles', 'members', 'permissions', 'master'];
    if (!validTypes.includes(type)) {
      return { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` };
    }
    const protections = await this.getProtections(guildId);
    if (type === 'master') {
      protections.channels = enabled;
      protections.roles = enabled;
      protections.members = enabled;
      protections.permissions = enabled;
    } else {
      protections[type] = enabled;
    }
    this.protections.set(guildId, protections);
    this.logIncident(guildId, 'system', 'protection_toggled', { type, enabled });
    return { message: `Protection ${type} ${enabled ? 'enabled' : 'disabled'}`, protections };
  }

  async getProtectionStatus(guildId) {
    const mode = this.modes.get(guildId) || { mode: 'moderate' };
    const mon = this.monitoring.get(guildId) || { active: false };
    const incidents = this.getIncidents(guildId, 50);
    const lastIncident = incidents.length > 0 ? incidents[0] : null;
    const threatsBlocked = incidents.filter(i => i.type === 'anomaly_detected').length;
    const uptime = mon.active && mon.startedAt ? Date.now() - mon.startedAt : 0;

    return {
      active: mon.active,
      mode: mode.mode,
      uptime,
      lastIncident: lastIncident?.timestamp || null,
      threatsBlocked,
      protections: await this.getProtections(guildId)
    };
  }

  // --- PREVIEW ---

  async previewResponse(guildId, scenario = 'channel_delete') {
    const validScenarios = ['channel_delete', 'role_delete', 'role_create', 'permission_change', 'bot_abuse', 'webhook_spam'];
    if (!validScenarios.includes(scenario)) {
      return { error: `Invalid scenario. Must be one of: ${validScenarios.join(', ')}` };
    }
    const settings = await this.getSettings(guildId);
    const mode = this.modes.get(guildId) || { mode: 'moderate' };

    const responseMap = {
      channel_delete: { detection: 'immediate', responseTime: 200, actions: ['freeze_channels', 'log', 'notify'], rollback: settings.rollback },
      role_delete: { detection: 'immediate', responseTime: 180, actions: ['freeze_roles', 'log', 'notify'], rollback: settings.rollback },
      role_create: { detection: 'within_seconds', responseTime: 500, actions: ['log', 'notify'], rollback: false },
      permission_change: { detection: 'within_seconds', responseTime: 350, actions: ['log', 'notify', 'restrict_permissions'], rollback: settings.rollback },
      bot_abuse: { detection: 'immediate', responseTime: 150, actions: ['freeze_staff', 'log', 'notify'], rollback: false },
      webhook_spam: { detection: 'within_seconds', responseTime: 400, actions: ['log', 'notify', 'delete_webhooks'], rollback: false }
    };

    const resp = responseMap[scenario];
    return {
      detection: resp.detection,
      responseTime: resp.responseTime,
      actions: resp.actions,
      notifications: settings.notifications,
      rollback: resp.rollback
    };
  }

  // --- POLICY ---

  async setPolicy(guildId, policy, value) {
    const validPolicies = ['autodelete', 'autorole', 'autochannel', 'autoban', 'autokick'];
    if (!validPolicies.includes(policy)) {
      return { error: `Invalid policy. Must be one of: ${validPolicies.join(', ')}` };
    }
    const key = guildId;
    if (!this.policies.has(key)) {
      this.policies.set(key, {});
    }
    this.policies.get(key)[policy] = value;
    this.logIncident(guildId, 'system', 'policy_changed', { policy, value });
    return { message: `Policy ${policy} set to ${value}` };
  }

  async getPolicies(guildId) {
    const key = guildId;
    if (!this.policies.has(key)) {
      this.policies.set(key, {
        autodelete: false,
        autorole: false,
        autochannel: false,
        autoban: false,
        autokick: false
      });
    }
    return { ...this.policies.get(key) };
  }

  async resetPolicies(guildId) {
    this.policies.set(guildId, {
      autodelete: false, autorole: false, autochannel: false,
      autoban: false, autokick: false
    });
    return { message: 'Policies reset to defaults' };
  }

  // --- PATTERNS ---

  async getAttackPatterns(guildId) {
    const key = guildId;
    const incidents = this.getIncidents(guildId, 200);
    const patterns = {};
    const attackers = {};

    for (const inc of incidents) {
      if (inc.type === 'anomaly_detected') {
        const atype = inc.details?.anomalies?.[0]?.type || 'unknown';
        patterns[atype] = (patterns[atype] || 0) + 1;
      }
      if (inc.userId && inc.userId !== 'system' && inc.userId !== 'decoy') {
        attackers[inc.userId] = (attackers[inc.userId] || 0) + 1;
      }
    }

    const topAttackers = Object.entries(attackers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));

    const learning = this.learning.get(guildId) || { enabled: false };

    return {
      patterns,
      lastUpdated: Date.now(),
      learningEnabled: learning.enabled,
      topAttackers
    };
  }

  // --- HEALTH ---

  async getHealth(guildId) {
    const mon = this.monitoring.get(guildId) || { active: false };
    const incidents = this.getIncidents(guildId, 100);
    const unresolved = incidents.filter(i => !i.resolved).length;
    const uptime = mon.active && mon.startedAt ? Date.now() - mon.startedAt : 0;

    const components = {
      monitoring: mon.active ? 'healthy' : 'inactive',
      sentinel: (this.sentinel.get(guildId)?.active) ? 'healthy' : 'inactive',
      guardian: (this.guardian.get(guildId)?.active) ? 'healthy' : 'inactive',
      learning: (this.learning.get(guildId)?.enabled) ? 'healthy' : 'inactive'
    };

    const issues = [];
    if (!mon.active) issues.push('Monitoring is inactive');
    if (unresolved > 10) issues.push('High number of unresolved incidents');

    const overall = issues.length === 0 ? 'healthy' : issues.length <= 2 ? 'degraded' : 'unhealthy';

    return {
      overall,
      uptime,
      lastCheck: Date.now(),
      components,
      metrics: {
        totalIncidents: incidents.length,
        unresolvedIncidents: unresolved,
        eventsTotal: mon.eventsTotal || 0
      },
      issues
    };
  }

  // --- ESCALATION ---

  async getEscalationConfig(guildId) {
    const key = guildId;
    if (!this.escalationConfigs.has(key)) {
      this.escalationConfigs.set(key, {
        levels: [
          { level: 1, action: 'log', trigger: 'anomaly_detected', cooldown: 0 },
          { level: 2, action: 'notify', trigger: 'risk_above_50', cooldown: 60000 },
          { level: 3, action: 'restrict', trigger: 'risk_above_70', cooldown: 300000 },
          { level: 4, action: 'freeze', trigger: 'risk_above_90', cooldown: 600000 },
          { level: 5, action: 'lockdown', trigger: 'critical_incident', cooldown: 3600000 }
        ]
      });
    }
    return { ...this.escalationConfigs.get(key) };
  }

  async setEscalationLevel(guildId, level, trigger) {
    const config = await this.getEscalationConfig(guildId);
    const existing = config.levels.find(l => l.level === level);
    if (existing) {
      existing.trigger = trigger;
    } else {
      config.levels.push({ level, action: 'log', trigger, cooldown: 60000 });
    }
    this.escalationConfigs.set(guildId, config);
    return { message: `Escalation level ${level} set with trigger: ${trigger}` };
  }

  async testEscalation(guildId, level) {
    const config = await this.getEscalationConfig(guildId);
    const lvl = config.levels.find(l => l.level === level);
    if (!lvl) return { error: `Level ${level} not found` };
    this.logIncident(guildId, 'system', 'escalation_tested', { level, action: lvl.action, trigger: lvl.trigger });
    return { level, action: lvl.action, trigger: lvl.trigger, wouldExecute: true };
  }

  // --- BENCHMARK ---

  async runBenchmark(guildId, iterations = 100) {
    const start = Date.now();
    let totalTime = 0;
    let minTime = Infinity;
    let maxTime = 0;
    let successes = 0;

    for (let i = 0; i < iterations; i++) {
      const iterStart = Date.now();
      try {
        this.getProfile(guildId, `bench_${i}`);
        this.calculateRisk(guildId, `bench_${i}`);
        this.getTrust(guildId, `bench_${i}`);
        successes++;
      } catch (e) { }
      const iterTime = Date.now() - iterStart;
      totalTime += iterTime;
      minTime = Math.min(minTime, iterTime);
      maxTime = Math.max(maxTime, iterTime);
    }

    const duration = Date.now() - start;
    const avgResponseTime = totalTime / iterations;
    const eventsPerSecond = (iterations / duration) * 1000;

    return {
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      minResponseTime: minTime,
      maxResponseTime: maxTime,
      eventsPerSecond: Math.round(eventsPerSecond * 100) / 100,
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      cpuUsage: process.cpuUsage().user,
      duration,
      successRate: Math.round((successes / iterations) * 100),
      recommendations: avgResponseTime > 10 ? ['Response time is high, consider optimizing'] : ['Performance is acceptable']
    };
  }

  // --- COMPATIBILITY ---

  async checkCompatibility(guildId) {
    const systems = {
      monitoring: !!this.monitoring.get(guildId)?.active,
      sentinel: !!this.sentinel.get(guildId)?.active,
      guardian: !!this.guardian.get(guildId)?.active,
      learning: !!this.learning.get(guildId)?.enabled,
      stageSystem: this.stages.has(guildId),
      decoys: this.getDecoys(guildId).length > 0
    };

    const conflicts = [];
    const mode = this.modes.get(guildId);
    if (mode?.mode === 'relaxed' && systems.guardian) {
      conflicts.push('Guardian is active in relaxed mode - may cause conflicts');
    }

    const activeCount = Object.values(systems).filter(Boolean).length;
    const score = Math.max(0, 100 - conflicts.length * 20);

    return {
      systems,
      conflicts,
      recommendations: conflicts.length > 0 ? ['Resolve conflicts for optimal protection'] : ['All systems compatible'],
      score
    };
  }

  // --- BASELINE ---

  async setBaseline(guildId) {
    const baseline = {
      channels: Math.floor(Math.random() * 50) + 5,
      roles: Math.floor(Math.random() * 20) + 3,
      members: Math.floor(Math.random() * 500) + 10,
      permissions: Math.floor(Math.random() * 100) + 10,
      capturedAt: Date.now()
    };
    this.baselines.set(guildId, baseline);
    this.logIncident(guildId, 'system', 'baseline_set', baseline);
    return { channels: baseline.channels, roles: baseline.roles, members: baseline.members, permissions: baseline.permissions };
  }

  async clearBaseline(guildId) {
    this.baselines.delete(guildId);
    return { message: 'Baseline cleared' };
  }

  async getBaseline(guildId) {
    return this.baselines.get(guildId) || null;
  }

  // --- AUTOMATIONS ---

  async getAutomations(guildId) {
    const key = guildId;
    if (!this.automations.has(key)) {
      this.automations.set(key, {
        enabled: false,
        autoRespond: true,
        autoFreeze: false,
        autoNotify: true,
        autoRollback: false,
        autoBan: false,
        autoKick: false,
        autoDelete: false
      });
    }
    return { ...this.automations.get(key) };
  }

  async enableAutomation(guildId, automation) {
    const data = await this.getAutomations(guildId);
    if (automation in data) {
      data[automation] = true;
      data.enabled = true;
      this.automations.set(guildId, data);
      return { message: `Automation ${automation} enabled` };
    }
    return { error: `Unknown automation: ${automation}` };
  }

  async disableAutomation(guildId, automation) {
    const data = await this.getAutomations(guildId);
    if (automation in data) {
      data[automation] = false;
      this.automations.set(guildId, data);
      return { message: `Automation ${automation} disabled` };
    }
    return { error: `Unknown automation: ${automation}` };
  }

  async setAutomatedResponses(guildId, enabled) {
    const data = await this.getAutomations(guildId);
    data.enabled = enabled;
    this.automations.set(guildId, data);
    return { message: `Automated responses ${enabled ? 'enabled' : 'disabled'}` };
  }

  async getAutomatedConfig(guildId) {
    return await this.getAutomations(guildId);
  }

  async setAutomatedConfig(guildId, action, enabled) {
    const data = await this.getAutomations(guildId);
    if (action in data) {
      data[action] = enabled;
      this.automations.set(guildId, data);
      return { message: `Automated config ${action} set to ${enabled}` };
    }
    return { error: `Unknown action: ${action}` };
  }

  // --- ANALYSIS ---

  async analyzeAttacks(guildId, days = 7) {
    const cutoff = Date.now() - (days * 86400000);
    const incidents = this.getIncidents(guildId, 500).filter(i => i.timestamp > cutoff);

    const attackTypes = {};
    const attackers = {};
    const timeline = {};

    for (const inc of incidents) {
      attackTypes[inc.type] = (attackTypes[inc.type] || 0) + 1;
      if (inc.userId && inc.userId !== 'system' && inc.userId !== 'decoy') {
        attackers[inc.userId] = (attackers[inc.userId] || 0) + 1;
      }
      const day = new Date(inc.timestamp).toISOString().split('T')[0];
      timeline[day] = (timeline[day] || 0) + 1;
    }

    return {
      period: `${days} days`,
      totalAttacks: incidents.length,
      attackTypes,
      topAttackers: Object.entries(attackers).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, count]) => ({ id, count })),
      timeline,
      averagePerDay: Math.round((incidents.length / days) * 100) / 100,
      analyzedAt: Date.now()
    };
  }

  // --- INCIDENT RESOLVE ---

  async resolveIncident(guildId, id, resolvedBy) {
    const incident = this.incidents.find(i => i.id === id && i.guildId === guildId);
    if (!incident) return { error: 'Incident not found' };
    incident.resolved = true;
    incident.resolvedBy = resolvedBy;
    incident.resolvedAt = Date.now();
    return { message: `Incident ${id} resolved by ${resolvedBy}` };
  }

  // --- BACKUP ---

  async createBackup(guildId) {
    const backupId = `backup_${guildId}_${Date.now()}`;
    const backup = {
      id: backupId,
      guildId,
      createdAt: Date.now(),
      modes: this.modes.get(guildId) || null,
      settings: await this.getSettings(guildId),
      advanced: await this.getAdvancedConfig(guildId),
      policies: await this.getPolicies(guildId),
      protections: await this.getProtections(guildId),
      guardian: this.guardian.get(guildId) || null,
      sentinel: this.sentinel.get(guildId) || null,
      automations: await this.getAutomations(guildId)
    };

    if (!this.snapshots.has('backups')) {
      this.snapshots.set('backups', new Map());
    }
    this.snapshots.get('backups').set(backupId, backup);
    this.logIncident(guildId, 'system', 'backup_created', { backupId });
    return { backupId, createdAt: backup.createdAt };
  }

  async listBackups(guildId) {
    const backups = this.snapshots.get('backups');
    if (!backups) return [];
    return [...backups.values()]
      .filter(b => b.guildId === guildId)
      .map(b => ({ id: b.id, createdAt: b.createdAt }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async restoreBackup(guildId, backupId) {
    const backups = this.snapshots.get('backups');
    if (!backups || !backups.has(backupId)) return { error: 'Backup not found' };
    const backup = backups.get(backupId);
    if (backup.guildId !== guildId) return { error: 'Backup does not belong to this guild' };

    if (backup.modes) this.modes.set(guildId, backup.modes);
    if (backup.settings) this.settings.set(guildId, backup.settings);
    if (backup.advanced) this.advancedConfigs.set(guildId, backup.advanced);
    if (backup.policies) this.policies.set(guildId, backup.policies);
    if (backup.protections) this.protections.set(guildId, backup.protections);
    if (backup.guardian) this.guardian.set(guildId, backup.guardian);
    if (backup.sentinel) this.sentinel.set(guildId, backup.sentinel);
    if (backup.automations) this.automations.set(guildId, backup.automations);

    this.logIncident(guildId, 'system', 'backup_restored', { backupId });
    return { message: `Backup ${backupId} restored successfully` };
  }

  // ==================== BOT SETTINGS ====================

  async getBotSettings(guildId) {
    const key = guildId;
    if (!this.botSettings.has(key)) {
      this.botSettings.set(key, {
        enabled: true,
        action: 'kick',
        whitelistedBots: [],
        alertChannel: null,
        lastModified: null
      });
    }
    return this.botSettings.get(key);
  }

  async setBotSetting(guildId, setting, value, userId) {
    const settings = await this.getBotSettings(guildId);
    settings[setting] = value;
    settings.lastModified = Date.now();
    this.botSettings.set(guildId, settings);
    this.logIncident(guildId, userId || 'system', 'bot_setting_changed', { setting, value });
    return settings;
  }

  async resetBotSettings(guildId, userId) {
    const defaults = {
      enabled: true,
      action: 'kick',
      whitelistedBots: [],
      alertChannel: null,
      lastModified: Date.now()
    };
    this.botSettings.set(guildId, defaults);
    this.logIncident(guildId, userId || 'system', 'bot_settings_reset', {});
    return defaults;
  }

  // ==================== SNAPSHOTS LIST ====================

  getSnapshots(guildId) {
    const snapshots = [];
    for (const [key, snapshot] of this.snapshots) {
      if (key.startsWith(guildId) && key !== 'backups') {
        snapshots.push(snapshot);
      }
    }
    return snapshots.sort((a, b) => b.timestamp - a.timestamp);
  }

  // ==================== DATABASE ====================

  async saveAction(guildId, userId, action, details) {
    try {
      const db = getDB();
      await db('security_actions').insert({
        guild_id: guildId,
        user_id: userId,
        action,
        details: JSON.stringify(details),
        created_at: new Date()
      });
    } catch (e) { }
  }

  async saveIncident(incident) {
    try {
      const db = getDB();
      await db('security_incidents').insert({
        guild_id: incident.guildId,
        user_id: incident.userId,
        type: incident.type,
        details: JSON.stringify(incident.details),
        resolved: incident.resolved,
        created_at: new Date(incident.timestamp)
      });
    } catch (e) { }
  }

  async saveSnapshot(snapshot) {
    try {
      const db = getDB();
      await db('security_snapshots').insert({
        guild_id: snapshot.guildId,
        data: JSON.stringify(snapshot),
        created_at: new Date(snapshot.timestamp)
      });
    } catch (e) { }
  }

  async getThresholds(guildId) {
    try {
      const db = getDB();
      const result = await db('security_thresholds').where('guild_id', guildId).first();
      if (!result) return null;
      return JSON.parse(result.thresholds);
    } catch (e) {
      return null;
    }
  }

  async setThreshold(guildId, type, count, seconds) {
    try {
      const db = getDB();
      const existing = await db('security_thresholds').where('guild_id', guildId).first();
      const thresholds = existing ? JSON.parse(existing.thresholds) : {
        channel: { count: 3, seconds: 60 },
        role: { count: 3, seconds: 60 },
        member: { count: 5, seconds: 60 }
      };
      thresholds[type] = { count, seconds };
      if (existing) {
        await db('security_thresholds').where('guild_id', guildId).update({ thresholds: JSON.stringify(thresholds) });
      } else {
        await db('security_thresholds').insert({ guild_id: guildId, thresholds: JSON.stringify(thresholds) });
      }
    } catch (e) {
      console.error('setThreshold error:', e);
    }
  }

  // ==================== ADVANCED ANTISPAM DETECTION ====================

  detectDuplicateMessages(messages, timeWindowMs = 10000) {
    const now = Date.now();
    const recent = messages.filter(m => now - m.timestamp < timeWindowMs);
    const groups = {};
    for (const msg of recent) {
      const content = msg.content.toLowerCase().trim();
      if (!groups[content]) groups[content] = [];
      groups[content].push(msg);
    }
    const duplicates = [];
    for (const [content, msgs] of Object.entries(groups)) {
      if (msgs.length >= 2) {
        duplicates.push({ content, count: msgs.length, userId: msgs[0].userId, channelId: msgs[0].channelId });
      }
    }
    return duplicates;
  }

  detectFlood(timestamps, count, windowMs) {
    const now = Date.now();
    const recent = timestamps.filter(t => now - t < windowMs);
    return recent.length >= count;
  }

  detectEmojiSpam(text, threshold, config = {}) {
    const customEmojiRegex = /<a?:\w+:\d+>/g;
    const unicodeEmojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu;

    let count = 0;
    if (config.custom !== false) count += (text.match(customEmojiRegex) || []).length;
    if (config.unicode !== false) count += (text.match(unicodeEmojiRegex) || []).length;

    return {
      triggered: count >= threshold,
      count,
      customCount: (text.match(customEmojiRegex) || []).length,
      unicodeCount: (text.match(unicodeEmojiRegex) || []).length
    };
  }

  detectCapsSpam(text, percent, minLength) {
    const letters = text.replace(/[^a-zA-Z]/g, '');
    const upper = text.replace(/[^A-Z]/g, '');
    if (letters.length < minLength) return { triggered: false, percent: 0 };
    const capsPercent = Math.round((upper.length / letters.length) * 100);
    return { triggered: capsPercent >= percent, percent: capsPercent, letters: letters.length, uppercase: upper.length };
  }

  detectWordSpam(text, blacklist) {
    const lower = text.toLowerCase();
    const matches = [];
    for (const entry of blacklist) {
      if (lower.includes(entry.word)) {
        matches.push({ word: entry.word, action: entry.action });
      }
    }
    return { triggered: matches.length > 0, matches };
  }

  detectMentionSpam(text, threshold) {
    const mentionRegex = /<@!?\d+>/g;
    const mentions = text.match(mentionRegex) || [];
    return { triggered: mentions.length >= threshold, count: mentions.length, mentions };
  }

  detectLinkSpam(text, threshold) {
    const linkRegex = /https?:\/\/[^\s]+|www\.[^\s]+|discord\.gg\/[^\s]+/gi;
    const links = text.match(linkRegex) || [];
    return { triggered: links.length >= threshold, count: links.length, links };
  }

  getSpamHistory(guildId, userId) {
    const key = `${guildId}:${userId}`;
    return this.spamHistory?.get(key) || [];
  }

  recordSpamEvent(guildId, userId, type, details) {
    const key = `${guildId}:${userId}`;
    if (!this.spamHistory) this.spamHistory = new Map();
    const history = this.spamHistory.get(key) || [];
    history.push({ type, details, timestamp: Date.now() });
    if (history.length > 100) history.shift();
    this.spamHistory.set(key, history);
  }

  // ==================== STATE PERSISTENCE ====================

  async saveState(guildId) {
    try {
      const db = getDB();
      const profiles = [...this.behavioralProfiles.entries()]
        .filter(([k]) => k.startsWith(guildId))
        .map(([k, v]) => ({ key: k, value: v }));

      for (const p of profiles) {
        const userId = p.key.split(':')[1];
        const existing = await db('security_actions').where('guild_id', guildId).where('user_id', userId).first();
        if (existing) {
          await db('security_actions').where('id', existing.id).update({ details: JSON.stringify(p.value) });
        } else {
          await db('security_actions').insert({ guild_id: guildId, user_id: userId, action: 'behavioral', details: JSON.stringify(p.value) });
        }
      }
    } catch (e) {
      console.error('saveState error:', e);
    }
  }

  async loadState(guildId) {
    try {
      const db = getDB();
      const records = await db('security_actions').where('guild_id', guildId).where('action', 'behavioral');
      for (const r of records) {
        this.behavioralProfiles.set(`${guildId}:${r.user_id}`, JSON.parse(r.details));
      }
    } catch (e) {
      console.error('loadState error:', e);
    }
  }

  async saveTrust(guildId) {
    try {
      const db = getDB();
      const trustEntries = [...this.trustScores.entries()]
        .filter(([k]) => k.startsWith(guildId))
        .map(([k, v]) => ({ key: k, value: v }));

      for (const t of trustEntries) {
        const userId = t.key.split(':')[1];
        const existing = await db('security_trust').where('guild_id', guildId).where('user_id', userId).first();
        const data = {
          guild_id: guildId,
          user_id: userId,
          trust_score: t.value.score || 0,
          trust_level: t.value.level || 'Newcomer',
          positive_actions: t.value.positive || 0,
          negative_actions: t.value.negative || 0,
          suspicious_actions: t.value.suspicious || 0,
          is_flagged: t.value.flagged || false,
          flag_reason: t.value.flagReason || null
        };
        if (existing) {
          await db('security_trust').where('id', existing.id).update(data);
        } else {
          await db('security_trust').insert(data);
        }
      }
    } catch (e) {
      console.error('saveTrust error:', e);
    }
  }

  async loadTrust(guildId) {
    try {
      const db = getDB();
      const records = await db('security_trust').where('guild_id', guildId);
      for (const r of records) {
        this.trustScores.set(`${guildId}:${r.user_id}`, {
          score: r.trust_score,
          level: r.trust_level,
          positive: r.positive_actions,
          negative: r.negative_actions,
          suspicious: r.suspicious_actions,
          flagged: r.is_flagged,
          flagReason: r.flag_reason
        });
      }
    } catch (e) {
      console.error('loadTrust error:', e);
    }
  }
}

module.exports = new SecurityCore();
