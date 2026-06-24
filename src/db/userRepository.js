const { getDB } = require('./connection');

async function getUser(userId, guildId) {
  const db = getDB();
  let user = await db('users')
    .where('user_id', userId)
    .where('guild_id', guildId)
    .first();
  
  if (!user) {
    user = {
      user_id: userId,
      guild_id: guildId,
      xp: 0,
      level: 0,
      balance: 0,
      bank: 0,
      inventory: '[]',
      warnings: '[]'
    };
    
    await db('users').insert(user);
  }
  
  return user;
}

async function updateUser(userId, guildId, data) {
  const db = getDB();
  const exists = await db('users')
    .where('user_id', userId)
    .where('guild_id', guildId)
    .first();
  
  if (exists) {
    return db('users')
      .where('user_id', userId)
      .where('guild_id', guildId)
      .update(data);
  } else {
    return db('users').insert({ user_id: userId, guild_id: guildId, ...data });
  }
}

async function deleteUser(userId, guildId) {
  const db = getDB();
  return db('users')
    .where('user_id', userId)
    .where('guild_id', guildId)
    .delete();
}

async function getLeaderboard(guildId, type = 'xp', limit = 10) {
  const db = getDB();
  return db('users')
    .where('guild_id', guildId)
    .orderBy(type, 'desc')
    .limit(limit);
}

async function getAllUsers(guildId) {
  const db = getDB();
  return db('users')
    .where('guild_id', guildId)
    .select('*');
}

async function addBalance(userId, guildId, amount) {
  const user = await getUser(userId, guildId);
  const newBalance = user.balance + amount;
  await updateUser(userId, guildId, { balance: newBalance });
  return newBalance;
}

async function removeBalance(userId, guildId, amount) {
  const user = await getUser(userId, guildId);
  const newBalance = Math.max(0, user.balance - amount);
  await updateUser(userId, guildId, { balance: newBalance });
  return newBalance;
}

async function addXP(userId, guildId, amount) {
  const user = await getUser(userId, guildId);
  const newXP = user.xp + amount;
  const newLevel = Math.floor(0.1 * Math.sqrt(newXP));
  const leveledUp = newLevel > user.level;
  
  await updateUser(userId, guildId, { xp: newXP, level: newLevel });
  
  return { xp: newXP, level: newLevel, leveledUp };
}

module.exports = { 
  getUser, 
  updateUser, 
  deleteUser, 
  getLeaderboard, 
  getAllUsers, 
  addBalance, 
  removeBalance, 
  addXP 
};
