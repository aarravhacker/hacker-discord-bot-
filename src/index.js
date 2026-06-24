require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials, Events } = require('discord.js');
const { connectDB, initializeDatabase } = require('./db/connection');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const logger = require('./utils/logger');
const config = require('./config');
const { initMusic } = require('./utils/musicManager');
const { startDashboard } = require('./dashboard/index');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessages
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember
  ]
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.config = config;

async function init() {
  try {
    logger.info('Starting Hacker Bot...');
    
    await connectDB();
    logger.info('Database connected');
    
    await initializeDatabase();
    logger.info('Database initialized');
    
    await loadCommands(client);
    logger.info(`Loaded ${client.commands.size} commands`);
    
    await loadEvents(client);
    logger.info('Events loaded');

    initMusic(client);
    logger.info('Music initialized');

    // Debug ALL raw events
    client.on('raw', (packet) => {
      if (['VOICE_STATE_UPDATE', 'VOICE_SERVER_UPDATE', 'VOICE_UPDATE'].includes(packet.t)) {
        console.log(`[Raw] ${packet.t} guild=${packet.d?.guild_id}`);
      }
    });

    startDashboard(client);
    logger.info('Dashboard started');

    client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

client.once(Events.ClientReady, (c) => {
  logger.info(`Logged in as ${c.user.tag}`);
  logger.info(`Serving ${c.guilds.cache.size} guilds`);
  
  c.user.setActivity('!help | 500+ Commands', { type: 'WATCHING' });
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

init();
