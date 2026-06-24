const { getDB } = require('./connection');

async function addModLog(data) {
  const db = getDB();
  return db('modlogs').insert(data);
}

async function getModLogs(guildId, limit = 10) {
  const db = getDB();
  return db('modlogs')
    .where('guild_id', guildId)
    .orderBy('created_at', 'desc')
    .limit(limit);
}

async function getModLogsByUser(guildId, userId, limit = 10) {
  const db = getDB();
  return db('modlogs')
    .where('guild_id', guildId)
    .where('user_id', userId)
    .orderBy('created_at', 'desc')
    .limit(limit);
}

async function getCaseNumber(guildId) {
  const db = getDB();
  const result = await db('modlogs')
    .where('guild_id', guildId)
    .max('case_number as max_case')
    .first();
  
  return (result.max_case || 0) + 1;
}

async function updateModLog(guildId, caseNumber, data) {
  const db = getDB();
  return db('modlogs')
    .where('guild_id', guildId)
    .where('case_number', caseNumber)
    .update(data);
}

async function deleteModLog(guildId, caseNumber) {
  const db = getDB();
  return db('modlogs')
    .where('guild_id', guildId)
    .where('case_number', caseNumber)
    .delete();
}

module.exports = { addModLog, getModLogs, getModLogsByUser, getCaseNumber, updateModLog, deleteModLog };
