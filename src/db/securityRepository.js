const { getDB } = require('./connection');

async function addSecurityLog(data) {
  const db = getDB();
  return db('security_logs').insert(data);
}

async function getSecurityLogs(guildId, type, limit = 10) {
  const db = getDB();
  let query = db('security_logs')
    .where('guild_id', guildId)
    .orderBy('created_at', 'desc')
    .limit(limit);
  
  if (type) {
    query = query.where('type', type);
  }
  
  return query;
}

async function getSecurityLogCount(guildId, type, timeWindow) {
  const db = getDB();
  let query = db('security_logs')
    .where('guild_id', guildId);
  
  if (type) {
    query = query.where('type', type);
  }
  
  if (timeWindow) {
    const since = new Date(Date.now() - timeWindow);
    query = query.where('created_at', '>=', since);
  }
  
  return query.count('id as count').first();
}

async function clearSecurityLogs(guildId, type) {
  const db = getDB();
  let query = db('security_logs').where('guild_id', guildId);
  
  if (type) {
    query = query.where('type', type);
  }
  
  return query.delete();
}

module.exports = { addSecurityLog, getSecurityLogs, getSecurityLogCount, clearSecurityLogs };
