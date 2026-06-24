const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const logger = require('../utils/logger');

const SLASH_COMMANDS = [
  'help', 'ping', 'stats', 'botinfo', 'serverinfo', 'userinfo',
  'calc', 'invite', 'time',
  'play', 'stop', 'skip', 'queue', 'pause', 'resume', 'volume',
  'ban', 'kick', 'mute', 'warn', 'purge', 'timeout',
  'unban', 'lock', 'unlock', 'slowmode',
  'createchannel', 'deletechannel',
  'afk', 'remind', 'poll', 'roleinfo', 'channelinfo',
  'serverconfig', 'prefix',
  'antinuke', 'antiraid', 'lockdown',
  'antispam', 'antilink', 'antibot',
  'antispampattern', 'antispamflood', 'antispamemoji', 'antispamcaps', 'antispamword',
  'antilinkdomain', 'antilinkphish', 'antilinkrate', 'antilinksafe', 'antilinkarchive',
  'antinukewebhook', 'antinukepermission', 'antinukesiege', 'antinukechain', 'antinukenuke',
  'automod', 'helpsecurity',
  'antinukeconfig', 'antinukethreshold', 'antinuketimeout',
  'antinukelog', 'antinukemonitor', 'antinukeguardian', 'antinukeprotect',
  'trust', 'forensics', 'snapshot', 'incident',
  'emergency', 'stage', 'threats',
  'antispamconfig', 'antispamaction', 'antispamignore', 'antispamlimit',
  'antilinkconfig', 'antilinkignore', 'antilinkscan',
  'antiraidconfig',
  'lockdownconfig', 'lockdownemergency', 'lockdownstatus',
  'securitystatus', 'securityscan', 'securityreport',
  'chat',
  'ticket',
  'balance', 'daily', 'work', 'rank', 'level',
  'joke',
  'giveaway',
  'dashboard'
];

async function loadCommands(client) {
  const commandsPath = path.join(__dirname, '..', 'commands');
  const categories = fs.readdirSync(commandsPath);

  let slashCount = 0;
  let prefixCount = 0;
  const slashCommands = [];

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const entries = fs.readdirSync(categoryPath);
    for (const entry of entries) {
      const entryPath = path.join(categoryPath, entry);

      if (fs.statSync(entryPath).isDirectory()) {
        const files = fs.readdirSync(entryPath).filter(f => f.endsWith('.js'));
        for (const file of files) {
          const filePath = path.join(entryPath, file);
          loadCommandFile(filePath, client, slashCommands, SLASH_COMMANDS);
        }
      } else if (entry.endsWith('.js')) {
        const filePath = path.join(categoryPath, entry);
        loadCommandFile(filePath, client, slashCommands, SLASH_COMMANDS);
      }
    }
  }

  slashCount = slashCommands.length;
  prefixCount = client.commands.size - slashCount;

  logger.info(`Commands loaded: ${slashCount} slash, ${prefixCount} prefix-only`);

  if (process.env.CLIENT_ID && process.env.DISCORD_TOKEN) {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
      logger.info(`Registering ${slashCount} slash commands...`);

      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: slashCommands.map(cmd => cmd.data.toJSON()) }
      );

      logger.info(`Successfully registered ${slashCount} slash commands`);
    } catch (error) {
      logger.error('Error registering slash commands:', error);
    }
  }

  return client.commands.size;
}

function loadCommandFile(filePath, client, slashCommands, slashList) {
  try {
    const command = require(filePath);

    if (!('data' in command) || !('execute' in command)) {
      logger.warn(`Invalid command file: ${filePath}`);
      return;
    }

    client.commands.set(command.data.name, command);

    // Register as slash command if in the list OR if it has slash: true
    const shouldRegister = slashList.includes(command.data.name) || command.slash === true;
    if (shouldRegister && !slashCommands.find(c => c.data.name === command.data.name)) {
      slashCommands.push(command);
    }
  } catch (error) {
    logger.error(`Error loading command ${filePath}:`, error);
  }
}

module.exports = { loadCommands };
