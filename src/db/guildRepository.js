const { getDB } = require('./connection');

const JSON_FIELDS = [
  'antinuke_config', 'antiraid_config', 'antibot_config', 'antilink_config',
  'antispam_config', 'lockdown_config', 'whitelist', 'blacklist',
  'antinuke_owners', 'ticket_config', 'welcome_config', 'goodbye_config',
  'levelup_config', 'locked_roles', 'lockrole_whitelist', 'antinuke_wl_roles'
];

function parseGuildJson(guild) {
  return guild;
}

function stringifyGuildJson(data) {
  const out = { ...data };
  for (const field of JSON_FIELDS) {
    if (out[field] !== undefined && out[field] !== null && typeof out[field] !== 'string') {
      out[field] = JSON.stringify(out[field]);
    }
  }
  return out;
}

async function getGuild(guildId) {
  const db = getDB();
  let guild = await db('guilds').where('guild_id', guildId).first();
  
  if (!guild) {
    guild = {
      guild_id: guildId,
      prefix: '!',
      antinuke_enabled: false,
      antinuke_config: '{}',
      antiraid_enabled: false,
      antiraid_config: '{}',
      antibot_enabled: false,
      antibot_config: '{}',
      antilink_enabled: false,
      antilink_config: '{}',
      antispam_enabled: false,
      antispam_config: '{}',
      lockdown_enabled: false,
      lockdown_config: '{}',
      log_channel: null,
      whitelist: '[]',
      blacklist: '[]',
      antinuke_bypass_role: null,
      antiraid_bypass_role: null,
      antispam_bypass_role: null,
      antilink_bypass_role: null,
      antibot_bypass_role: null
    };
    
    await db('guilds').insert(guild);
  }
  
  return parseGuildJson(guild);
}

async function updateGuild(guildId, data) {
  const db = getDB();
  const exists = await db('guilds').where('guild_id', guildId).first();
  const safeData = stringifyGuildJson(data);
  
  if (exists) {
    return db('guilds').where('guild_id', guildId).update(safeData);
  } else {
    return db('guilds').insert({ guild_id: guildId, ...safeData });
  }
}

async function deleteGuild(guildId) {
  const db = getDB();
  return db('guilds').where('guild_id', guildId).delete();
}

async function getAllGuilds() {
  const db = getDB();
  return db('guilds').select('*');
}

module.exports = { getGuild, updateGuild, deleteGuild, getAllGuilds };
