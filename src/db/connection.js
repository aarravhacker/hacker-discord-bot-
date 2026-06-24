const knex = require('knex');
const knexConfig = require('../../knexfile');
const logger = require('../utils/logger');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

let db;

function connectDB() {
  return new Promise((resolve, reject) => {
    try {
      db = knex(config);
      
      db.raw('SELECT 1')
        .then(() => {
          logger.info('SQLite connected successfully');
          resolve(db);
        })
        .catch(err => {
          logger.error('SQLite connection failed:', err);
          reject(err);
        });
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      reject(error);
    }
  });
}

function getDB() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

async function initializeDatabase() {
  try {
    await db.schema.hasTable('guilds').then(exists => {
      if (!exists) {
        return db.schema.createTable('guilds', table => {
          table.string('guild_id').primary();
          table.string('prefix').defaultTo('!');
          table.boolean('antinuke_enabled').defaultTo(false);
          table.json('antinuke_config').defaultTo('{}');
          table.boolean('antiraid_enabled').defaultTo(false);
          table.json('antiraid_config').defaultTo('{}');
          table.boolean('antibot_enabled').defaultTo(false);
          table.json('antibot_config').defaultTo('{}');
          table.boolean('antilink_enabled').defaultTo(false);
          table.json('antilink_config').defaultTo('{}');
          table.boolean('antispam_enabled').defaultTo(false);
          table.json('antispam_config').defaultTo('{}');
          table.boolean('lockdown_enabled').defaultTo(false);
          table.json('lockdown_config').defaultTo('{}');
          table.string('log_channel');
          table.json('whitelist').defaultTo('[]');
          table.json('blacklist').defaultTo('[]');
          table.timestamps(true, true);
        });
      }
    });

    const guildCols = [
      { name: 'mod_log_channel', type: 'string' },
      { name: 'mute_role', type: 'string' },
      { name: 'welcome_channel', type: 'string' },
      { name: 'welcome_enabled', type: 'boolean', def: false },
      { name: 'welcome_config', type: 'json', def: '{}' },
      { name: 'goodbye_config', type: 'json', def: '{}' },
      { name: 'ticket_config', type: 'json', def: '{}' },
      { name: 'starboard_channel', type: 'string' },
      { name: 'levelup_channel', type: 'string' },
      { name: 'levelup_config', type: 'json', def: '{}' },
      { name: 'antinuke_owners', type: 'json', def: '[]' },
      { name: 'antinuke_logging', type: 'boolean', def: false },
      { name: 'antinuke_punishment', type: 'string', def: 'ban' },
      { name: 'antinuke_wl_roles', type: 'json', def: '[]' },
      { name: 'role_friend', type: 'string' },
      { name: 'role_girl', type: 'string' },
      { name: 'role_guest', type: 'string' },
      { name: 'role_staff', type: 'string' },
      { name: 'role_vip', type: 'string' },
      { name: 'required_role', type: 'string' },
      { name: 'locked_roles', type: 'json', def: '[]' },
      { name: 'lockrole_punishment', type: 'string', def: 'remove' },
      { name: 'lockrole_whitelist', type: 'json', def: '[]' },
      { name: 'antinuke_bypass_role', type: 'string' },
      { name: 'antiraid_bypass_role', type: 'string' },
      { name: 'antispam_bypass_role', type: 'string' },
      { name: 'antilink_bypass_role', type: 'string' },
      { name: 'antibot_bypass_role', type: 'string' },
      { name: 'antinuke_timeout_duration', type: 'integer' }
    ];

    for (const col of guildCols) {
      const has = await db.schema.hasColumn('guilds', col.name);
      if (!has) {
        if (col.type === 'string') {
          await db.schema.alterTable('guilds', t => t.string(col.name));
        } else if (col.type === 'boolean') {
          await db.schema.alterTable('guilds', t => t.boolean(col.name).defaultTo(col.def));
        } else if (col.type === 'json') {
          await db.schema.alterTable('guilds', t => t.json(col.name).defaultTo(col.def));
        } else if (col.type === 'integer') {
          await db.schema.alterTable('guilds', t => t.integer(col.name));
        }
      }
    }

    await db.schema.hasTable('security_logs').then(exists => {
      if (!exists) {
        return db.schema.createTable('security_logs', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.string('user_id');
          table.string('action');
          table.string('type');
          table.text('details');
          table.json('metadata').defaultTo('{}');
          table.timestamps(true, true);
          table.index('guild_id');
          table.index('user_id');
          table.index('type');
        });
      }
    });

    await db.schema.hasTable('modlogs').then(exists => {
      if (!exists) {
        return db.schema.createTable('modlogs', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.string('user_id');
          table.string('moderator_id');
          table.string('action');
          table.text('reason');
          table.string('case_number');
          table.timestamps(true, true);
          table.index('guild_id');
          table.index('user_id');
        });
      }
    });

    await db.schema.hasTable('users').then(exists => {
      if (!exists) {
        return db.schema.createTable('users', table => {
          table.string('user_id').primary();
          table.string('guild_id');
          table.integer('xp').defaultTo(0);
          table.integer('level').defaultTo(0);
          table.integer('balance').defaultTo(0);
          table.integer('bank').defaultTo(0);
          table.json('inventory').defaultTo('[]');
          table.json('warnings').defaultTo('[]');
          table.timestamps(true, true);
          table.index('guild_id');
        });
      }
    });

    const userCols = [
      { name: 'last_daily', type: 'integer' },
      { name: 'daily_streak', type: 'integer' },
      { name: 'last_work', type: 'integer' },
      { name: 'rank', type: 'string' },
      { name: 'xp_multiplier', type: 'float' }
    ];

    for (const col of userCols) {
      const has = await db.schema.hasColumn('users', col.name);
      if (!has) {
        if (col.type === 'string') {
          await db.schema.alterTable('users', t => t.string(col.name));
        } else if (col.type === 'integer') {
          await db.schema.alterTable('users', t => t.integer(col.name));
        } else if (col.type === 'float') {
          await db.schema.alterTable('users', t => t.float(col.name));
        }
      }
    }

    await db.schema.hasTable('tickets').then(exists => {
      if (!exists) {
        return db.schema.createTable('tickets', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.string('user_id');
          table.string('channel_id');
          table.string('status').defaultTo('open');
          table.string('priority').defaultTo('normal');
          table.string('claimed_by');
          table.json('messages').defaultTo('[]');
          table.timestamps(true, true);
          table.index('guild_id');
          table.index('status');
        });
      }
    });

    const ticketCols = [
      { name: 'claimed_by', type: 'string' },
      { name: 'rating', type: 'integer' },
      { name: 'channel_name', type: 'string' }
    ];

    for (const col of ticketCols) {
      const has = await db.schema.hasColumn('tickets', col.name);
      if (!has) {
        await db.schema.alterTable('tickets', t => {
          if (col.type === 'integer') t.integer(col.name);
          else t.string(col.name);
        });
      }
    }

    await db.schema.hasTable('reaction_roles').then(exists => {
      if (!exists) {
        return db.schema.createTable('reaction_roles', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.string('message_id');
          table.string('channel_id');
          table.json('roles').defaultTo('{}');
          table.timestamps(true, true);
          table.index('guild_id');
          table.index('message_id');
        });
      }
    });

    await db.schema.hasTable('welcome').then(exists => {
      if (!exists) {
        return db.schema.createTable('welcome', table => {
          table.string('guild_id').primary();
          table.boolean('enabled').defaultTo(false);
          table.string('channel_id');
          table.json('config').defaultTo('{}');
          table.timestamps(true, true);
        });
      }
    });

    await db.schema.hasTable('level_roles').then(exists => {
      if (!exists) {
        return db.schema.createTable('level_roles', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.integer('level');
          table.string('role_id');
          table.timestamps(true, true);
          table.index('guild_id');
        });
      }
    });

    await db.schema.hasTable('reminders').then(exists => {
      if (!exists) {
        return db.schema.createTable('reminders', table => {
          table.increments('id').primary();
          table.string('user_id');
          table.string('guild_id');
          table.string('channel_id');
          table.text('message');
          table.timestamp('remind_at');
          table.boolean('repeated').defaultTo(false);
          table.timestamps(true, true);
          table.index('user_id');
        });
      }
    });

    await db.schema.hasTable('automod').then(exists => {
      if (!exists) {
        return db.schema.createTable('automod', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.string('type');
          table.json('config').defaultTo('{}');
          table.boolean('enabled').defaultTo(false);
          table.timestamps(true, true);
          table.index('guild_id');
        });
      }
    });

    await db.schema.hasTable('giveaways').then(exists => {
      if (!exists) {
        return db.schema.createTable('giveaways', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.string('channel_id');
          table.string('message_id');
          table.string('prize');
          table.integer('winner_count').defaultTo(1);
          table.json('entries').defaultTo('[]');
          table.timestamp('end_time');
          table.boolean('ended').defaultTo(false);
          table.timestamps(true, true);
          table.index('guild_id');
        });
      }
    });

    await db.schema.hasTable('polls').then(exists => {
      if (!exists) {
        return db.schema.createTable('polls', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.string('channel_id');
          table.string('message_id');
          table.string('question');
          table.json('options').defaultTo('[]');
          table.json('votes').defaultTo('{}');
          table.boolean('ended').defaultTo(false);
          table.timestamps(true, true);
          table.index('guild_id');
        });
      }
    });

    await db.schema.hasTable('security_actions').then(exists => {
      if (!exists) {
        return db.schema.createTable('security_actions', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.string('user_id');
          table.string('action');
          table.json('details').defaultTo('{}');
          table.timestamps(true, true);
          table.index('guild_id');
          table.index('user_id');
          table.index('action');
        });
      }
    });

    await db.schema.hasTable('security_incidents').then(exists => {
      if (!exists) {
        return db.schema.createTable('security_incidents', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.string('user_id');
          table.string('type');
          table.json('details').defaultTo('{}');
          table.boolean('resolved').defaultTo(false);
          table.timestamps(true, true);
          table.index('guild_id');
          table.index('type');
          table.index('resolved');
        });
      }
    });

    await db.schema.hasTable('security_snapshots').then(exists => {
      if (!exists) {
        return db.schema.createTable('security_snapshots', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.json('data');
          table.timestamps(true, true);
          table.index('guild_id');
        });
      }
    });

    await db.schema.hasTable('security_trust').then(exists => {
      if (!exists) {
        return db.schema.createTable('security_trust', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.string('user_id');
          table.integer('trust_score').defaultTo(10);
          table.integer('trust_level').defaultTo(1);
          table.integer('positive_actions').defaultTo(0);
          table.integer('negative_actions').defaultTo(0);
          table.integer('suspicious_actions').defaultTo(0);
          table.boolean('is_flagged').defaultTo(false);
          table.text('flag_reason');
          table.timestamps(true, true);
          table.index('guild_id');
          table.index('user_id');
        });
      }
    });

    await db.schema.hasTable('security_decoys').then(exists => {
      if (!exists) {
        return db.schema.createTable('security_decoys', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.string('type');
          table.string('target_id');
          table.string('name');
          table.boolean('triggered').defaultTo(false);
          table.integer('trigger_count').defaultTo(0);
          table.timestamps(true, true);
          table.index('guild_id');
        });
      }
    });

    await db.schema.hasTable('security_thresholds').then(exists => {
      if (!exists) {
        return db.schema.createTable('security_thresholds', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.json('thresholds').defaultTo('{}');
          table.timestamps(true, true);
          table.index('guild_id');
        });
      }
    });

    logger.info('Database tables initialized');
  } catch (error) {
    logger.error('Error initializing database tables:', error);
    throw error;
  }
}

module.exports = { connectDB, getDB, initializeDatabase };
