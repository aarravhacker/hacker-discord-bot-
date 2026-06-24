const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

const CATEGORIES = {
  '🛡️ Security': {
    color: 0xed4245,
    desc: 'Military-grade server protection',
    icon: '🛡️',
    cmds: [
      'antinuke enable', 'antinuke disable', 'antinuke logging', 'antinuke owner add', 'antinuke owner remove', 'antinuke owner list', 'antinuke owner reset', 'antinuke punishment', 'antinuke setup', 'antinuke status', 'antinuke whitelist add', 'antinuke whitelist remove', 'antinuke whitelist reset', 'antinuke whitelist show', 'antinuke wlrole add', 'antinuke wlrole remove', 'antinuke wlrole list', 'antinuke wlrole reset',
      'antinukealert', 'antinukebackup', 'antinukeban', 'antinukeconfig', 'antinukehistory', 'antinukeignore', 'antinukekick', 'antinukelimit', 'antinukelog', 'antinukemute', 'antinukerevert', 'antinuketest', 'antinuketimeout', 'antinukewhitelist', 'antinukesettings', 'antinukestatus2', 'antinukescan', 'antinukeguardian', 'antinukesentinel',
      'antiraid', 'antiraidconfig', 'antiraidignore', 'antiraidlog', 'antiraidmode',
      'antibot', 'antibotconfig', 'antibotignore', 'antibotlog',
      'antilink', 'antilinkconfig', 'antilinkignore', 'antilinklog',
      'lockdown', 'lockdownconfig', 'lockdownrole', 'lockdownchannel', 'lockdownlog', 'lockdownhistory', 'lockdownstatus',
      'securityscan', 'securitystatus', 'securityreport', 'securitygraph',
      'trust', 'trustscan', 'trustreport', 'trustsettings', 'trustgroups',
      'snapshot', 'snapshotauto', 'snapshotdelete', 'snapshotdiff',
      'forensics', 'forensicscan', 'forensicreport', 'forensicexport',
      'evidencecollect', 'evidenceexport', 'evidencepreserve',
      'incident', 'incidentanalyze', 'incidentcreate',
      'honeypot', 'decoy', 'decoyguard', 'decoyscan', 'trap', 'fakeadmin',
      'canary', 'stage', 'emergency', 'recoveryauto', 'recoverystatus',
      'insider', 'insideralert', 'insiderguard', 'insiderscan',
      'behavioralert', 'behavioranomaly', 'behaviorbaseline', 'behaviormonitor',
      'threats', 'threatexplain', 'riskanalysis'
    ]
  },
  '⚔️ Moderation': {
    color: 0x5865f2,
    desc: 'Kick, ban, mute, warn and manage members',
    icon: '⚔️',
    cmds: [
      'ban', 'kick', 'mute', 'unmute', 'warn', 'warnings', 'purge', 'purgeall', 'purgebot', 'purgeimages', 'purgeuser',
      'slowmode', 'lock', 'unlock', 'lockall', 'unlockall',
      'massban', 'massunban', 'masskick', 'massrole', 'massnick',
      'tempmute', 'tempban', 'tempdeafen', 'tempkick', 'softban',
      'role', 'removerole', 'createrole', 'nick', 'resetnick',
      'vmute', 'deafen', 'timeout', 'voicekick', 'voicemove', 'voicesplit', 'forcejoin', 'pull', 'disconnect', 'move',
      'userinfo', 'case', 'casedelete', 'caseedit', 'casehistory', 'modlogs', 'reason', 'warns', 'warnlist', 'warnremove', 'clearwarnings',
      'setmuterole', 'setmodlog', 'modlogchannel', 'setlogchannel', 'logchannel',
      'addmod', 'admin', 'clear', 'clone', 'delrole', 'delsticker', 'enlarge', 'hide', 'hideall', 'hideall',
      'mod', 'modlimit', 'modstats', 'owner', 'roleicon', 'rrole', 'snipe', 'stickersearch',
      'unbanall', 'unhide', 'unhideall', 'unslowmode', 'addsticker',
      'voice', 'autonick', 'ignore', 'vcdisconnect'
    ]
  },
  '🤖 Auto-Mod': {
    color: 0xeb459e,
    desc: 'Automated filters for spam, words, and links',
    icon: '🤖',
    cmds: [
      'automod', 'automodaction', 'automodadd', 'automodconfig', 'automodignore', 'automodlist', 'automodlogs', 'automodremove', 'automodstatus', 'automodtest',
      'wordfilter', 'wordfilteraction', 'wordfilterignore', 'wordfilterlog', 'wordlist', 'addword', 'removeword', 'badword', 'badwordlist', 'badwordremove',
      'capsfilter', 'capslimit', 'emojispam', 'profanity', 'slurfilter',
      'spamfilter', 'spamaction', 'spamlimit', 'spamtime', 'spamlog', 'spamignore', 'spamwarn', 'spammute', 'spamkick', 'spamban',
      'antispam', 'antispamaction', 'antispamconfig', 'antispamignore', 'antispamlog'
    ]
  },
  '👑 Admin': {
    color: 0xfee75c,
    desc: 'Server configuration and management',
    icon: '👑',
    cmds: [
      'createchannel', 'deletechannel', 'editchannel', 'clonechannel', 'archivechannel', 'category', 'createcategory', 'deletecategory',
      'channelinfo', 'channellist', 'channellock', 'channelpermissions', 'channeldescription', 'nsfw', 'topic',
      'createrole', 'deleterole', 'editrole', 'rolecreate', 'rolecolor', 'rolename', 'rolehoist', 'rolepermissions', 'roleinfo', 'roleall', 'rolemembers', 'rolecount', 'roleposition', 'rolemerge',
      'setup', 'config', 'serverconfig', 'setprefix', 'prefix', 'setlog', 'logchannel',
      'setwelcome', 'setgoodbye', 'setstarboard', 'starboardchannel', 'setlevelup', 'levelupchannel', 'setboostmsg', 'boostchannel', 'setrules', 'ruleschannel',
      'serverstats', 'membercount',
      'lockrole', 'maintenance', 'vcrole', 'activityrole', 'vanityrole', 'voicemaster',
      'vcban', 'vcbitrate', 'vcchat', 'vcclean', 'vclaim', 'vchide', 'vcinvoke', 'vckick', 'vclimit', 'vclock', 'vclogs', 'vcregion', 'vcstatus', 'vcsuppress', 'vctransfer', 'vctrust', 'vcunban', 'vcunhide', 'vcunlock', 'vcunsuppress', 'vcuntrust'
    ]
  },
  '📋 Logging': {
    color: 0x57f287,
    desc: 'Track messages, members, and voice activity',
    icon: '📋',
    cmds: [
      'messagelog', 'messagelogconfig', 'messagelogdelete', 'messagelogedit', 'messagelogignore', 'messagelogimage', 'messagelogs', 'messagelogsearch', 'messagelogexport', 'messagelogclear',
      'memberlog', 'memberlogconfig', 'memberlogjoin', 'memberlogleave', 'memberlogban', 'memberlogkick', 'memberlogrole', 'memberlognick', 'memberlogs', 'memberlogexport',
      'voicelog', 'voicelogconfig', 'voicelogjoin', 'voicelogleave', 'voicelogmove', 'voicelogs', 'voicelogmute', 'voicelogchannel', 'voicelogexport', 'voicelogclear',
      'logging', 'channellog', 'logall', 'modlog', 'msglog', 'rolelog', 'serverlog'
    ]
  },
  '👋 Welcome': {
    color: 0x57f287,
    desc: 'Welcome, goodbye, and role systems',
    icon: '👋',
    cmds: [
      'setwelcome', 'welcomechannel', 'welcomeembed', 'welcomeimage', 'welcomeping', 'welcomecolor', 'welcometitle', 'welcomemsg', 'welcomefooter', 'welcomeauthor', 'welcomefields', 'welcomepreview', 'welcomeconfig', 'welcometest', 'welcomeclear',
      'setgoodbye', 'goodbyechannel', 'goodbyeembed', 'goodbyeimage', 'goodbyeping', 'goodbyecolor', 'goodbyetitle', 'goodbyemsg', 'goodbyeconfig', 'goodbyetest',
      'greet', 'autorole', 'girl', 'guest', 'vip', 'staff',
      'rfriend', 'rgirl', 'rguest', 'rstaff', 'rvip'
    ]
  },
  '🎫 Tickets': {
    color: 0xed4245,
    desc: 'Support ticket system with panels',
    icon: '🎫',
    cmds: [
      'ticket', 'open', 'closeticket', 'ticketconfig', 'ticketlist', 'ticketclaim',
      'ticketadd', 'ticketremove', 'ticketarchive', 'ticketclose', 'ticketreopen',
      'ticketcategory', 'ticketchannel', 'ticketlog', 'ticketmessage', 'ticketpriority', 'ticketrole', 'ticketstats', 'tickettemplate', 'transcript',
      'ticketmanager'
    ]
  },
  '🔧 Utility': {
    color: 0x5865f2,
    desc: 'General purpose tools and information',
    icon: '🔧',
    cmds: [
      'help', 'helpadmin', 'helpmod', 'helpsecurity', 'ping', 'uptime', 'stats', 'botinfo', 'serverinfo', 'userinfo', 'memberinfo', 'roleinfo', 'channelinfo',
      'invite', 'support', 'vote',
      'translate', 'weather', 'forecast', 'time', 'date', 'timestamp',
      'calc', 'calculator', 'convert', 'currency', 'color', 'hex',
      'dictionary', 'urban', 'github', 'repo',
      'remind', 'reminders', 'afk', 'afklist', 'afkremove', 'poll', 'createpoll', 'strawpoll',
      'list', 'messages', 'pfp', 'badges', 'banner', 'checkvanity', 'clearmessages', 'first-message', 'status', 'membercount'
    ]
  },
  '📊 Leveling': {
    color: 0x5865f2,
    desc: 'XP, ranks, and leveling system',
    icon: '📊',
    cmds: [
      'rank', 'level', 'levelcard', 'xp', 'progress', 'profile',
      'leaderboard', 'xpleaderboard',
      'setxprole', 'removexprole', 'xproles', 'levelupchannel', 'levelupmessage',
      'addxp', 'removexp', 'setxp', 'resetxp', 'xpmultiplier', 'xprate', 'xpboost'
    ]
  },
  '🎮 Fun': {
    color: 0xeb459e,
    desc: 'Games, memes, and entertainment',
    icon: '🎮',
    cmds: [
      'joke', 'pun', 'dadjoke', 'darkjoke', 'meme', 'dankmeme', 'reddit',
      '8ball', 'magic8ball', 'coinflip', 'dice', 'roll', 'choose', 'pick', 'random',
      'ship', 'love', 'match', 'insult', 'compliment', 'roast', 'advice', 'fortune', 'quote',
      'hug', 'slap', 'pat', 'kiss', 'rate', 'hotornot', 'wouldyourather', 'wyr',
      'fact', 'catfact', 'dogfact', 'emoji', 'randomemoji',
      'hangman', 'trivia', 'tictactoe', 'connect4',
      '2048', 'akinator', 'battleship', 'chess', 'country-guesser', 'memory-game', 'number-slider', 'reaction', 'rps', 'tic-tac-toe', 'typerace', 'wordle',
      'minecraft', 'roblox', 'snapchat', 'valorant', 'xbox', 'chatgpt'
    ]
  },
  '💰 Economy': {
    color: 0xfee75c,
    desc: 'Virtual currency, shop, and jobs',
    icon: '💰',
    cmds: [
      'balance', 'bal', 'wallet', 'bank', 'deposit', 'dep', 'withdraw', 'wd',
      'work', 'job', 'career', 'resign',
      'daily', 'weekly', 'monthly', 'yearly', 'beg',
      'shop', 'store', 'buy', 'sell', 'inventory', 'inv', 'items', 'equip', 'unequip', 'use',
      'pay', 'give', 'transfer', 'send',
      'leaderboard', 'lb', 'richest', 'top',
      'slots', 'slot', 'jackpot', 'casino', 'rob', 'steal'
    ]
  },
  '🎵 Music': {
    color: 0x1db954,
    desc: 'Music player, queue, and effects',
    icon: '🎵',
    cmds: [
      'play', 'p', 'pause', 'resume', 'stop', 'skip', 'next', 'prev', 'previous',
      'queue', 'q', 'nowplaying', 'np', 'current',
      'volume', 'vol', 'loud', 'quiet',
      'shuffle', 'loop', 'loopqueue', 'lyrics', 'song',
      'bassboost', 'nightcore', '8d', 'vaporwave', 'earrape', 'speed', 'pitch', 'karaoke', 'tremolo', 'vibrato', 'radio', 'clearfilters',
      'chipmunk', 'damon', 'darthvader', 'daycore', 'enhance', 'equalizer', 'forcefix', 'grab', 'lofi', 'slomo', 'vibrate',
      '247', 'autoplay', 'clearqueue', 'connect', 'playerinfo', 'playlist', 'pushfirst', 'seek', 'spotify', 'switchnode', 'toggle'
    ]
  },
  '🖼️ Images': {
    color: 0xeb459e,
    desc: 'Image manipulation and generation',
    icon: '🖼️',
    cmds: [
      'avatar', 'av', 'pfp', 'banner', 'userbanner', 'servericon', 'guildicon', 'icon', 'serverbanner', 'guildbanner',
      'blur', 'sharpen', 'brighten', 'darken', 'grayscale', 'greyscale', 'sepia', 'invert', 'flip', 'mirror', 'rotate', 'resize', 'scale', 'crop',
      'meme', 'drake', 'wanted', 'arrested', 'jail', 'achievement'
    ]
  },
  '🔢 Math': {
    color: 0x5865f2,
    desc: 'Mathematical calculations',
    icon: '🔢',
    cmds: [
      'calc', 'calculate', 'math', 'add', 'subtract', 'multiply', 'divide',
      'pow', 'sqrt', 'log', 'sin', 'cos', 'tan', 'factorial', 'fibonacci'
    ]
  },
  '📝 Text': {
    color: 0x5865f2,
    desc: 'Text manipulation and formatting',
    icon: '📝',
    cmds: [
      'ascii', 'figlet', 'reverse', 'mock', 'spongebob', 'zalgo', 'glitch', 'vaporwave', 'aesthetic',
      'owo', 'uwu', 'clap', 'emoji', 'spoil', 'spoiler',
      'embed', 'makeembed', 'code', 'codeblock', 'shrug',
      'autoreact', 'autoresponder', 'getstickies', 'stick', 'stickremove', 'stickstart', 'stickstop', 'media'
    ]
  },
  '🎉 Giveaway': {
    color: 0xfee75c,
    desc: 'Giveaway creation and management',
    icon: '🎉',
    cmds: [
      'giveaway', 'gstart', 'gcreate', 'giveawayend', 'gend', 'gstop',
      'giveawayreroll', 'reroll', 'greroll', 'giveawaylist'
    ]
  },
  '📊 Polls': {
    color: 0x5865f2,
    desc: 'Create and manage polls',
    icon: '📈',
    cmds: [
      'poll', 'createpoll', 'pollvote', 'vote', 'pollresults', 'results',
      'endpoll', 'closepoll', 'deletepoll', 'removepoll'
    ]
  },
  '⏰ Reminders': {
    color: 0x57f287,
    desc: 'Set and manage reminders',
    icon: '⏰',
    cmds: [
      'remind', 'setreminder', 'reminder', 'reminders', 'myreminders', 'reminderlist',
      'cancelreminder', 'deletereminder', 'editreminder', 'modifyreminder'
    ]
  },
  '🔄 Reaction Roles': {
    color: 0x5865f2,
    desc: 'Reaction role management',
    icon: '🔄',
    cmds: [
      'reactionrole', 'reactionroleadd', 'reactionroleremove', 'reactionroledelete', 'reactionrolelist', 'reactionroleconfig',
      'rr', 'rradd', 'rrremove', 'rrdelete', 'rrlist', 'rrconfig',
      'reactionrolechannel', 'reactionrolemode', 'reactionrolelimit', 'reactionrolelog',
      'reactionroletest', 'reactionroleclear', 'reactionrolebackup', 'reactionrolerestore'
    ]
  },
  '📺 Dashboard': {
    color: 0x2f3136,
    desc: 'Server control center and management',
    icon: '📺',
    cmds: [
      'dashboard', 'dashchannels', 'dashmembers', 'dashsettings', 'dashsecurity'
    ]
  }
};

const CAT_NAMES = Object.keys(CATEGORIES);
const CAT_TOTAL = CAT_NAMES.reduce((sum, c) => sum + CATEGORIES[c].cmds.length, 0);

let totalAliases = 0;
function countAliases(client) {
  let count = 0;
  client.commands.forEach(cmd => {
    if (cmd.aliases && cmd.aliases.length) count += cmd.aliases.length;
  });
  return count;
}

function buildHomeEmbed(client) {
  const catCount = CAT_NAMES.length;
  const aliasCount = countAliases(client);
  const uptimeSec = process.uptime();
  const uptimeStr = uptimeSec > 3600
    ? `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`
    : `${Math.floor(uptimeSec / 60)}m`;
  const memMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
  const ping = client.ws?.ping || 0;

  const embed = new EmbedBuilder()
    .setTitle(`${client.user.username} Help Center`)
    .setColor(0x2f3136)
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setDescription(
      `Choose a category below or run \`!help <command>\` for details.\n` +
      `**1,363+ commands** across **${catCount} categories** with dropdown navigation.`
    )
    .addFields(
      { name: 'Prefix', value: '`!`', inline: true },
      { name: 'Commands', value: `\`${CAT_TOTAL}\``, inline: true },
      { name: 'Categories', value: `\`${catCount}\``, inline: true },
      { name: 'Aliases', value: `\`${aliasCount}\``, inline: true },
      { name: 'Guilds', value: `\`${client.guilds.cache.size}\``, inline: true },
      { name: 'Uptime', value: `\`${uptimeStr}\``, inline: true },
      { name: 'Memory', value: `\`${memMB} MB\``, inline: true },
      { name: 'Latency', value: `\`${ping}ms\``, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: 'Quick Start', value: [
        '`!antinuke setup` - Enable antinuke',
        '`!automod` - Configure automod',
        '`!setup` - Server setup',
        '`!greet setup` - Welcome messages',
        '`!play <song>` - Music player'
      ].join('\n'), inline: false }
    )
    .setFooter({ text: `Use the dropdown menu to browse commands by category.` })
    .setTimestamp();

  return embed;
}

function buildCategoryEmbed(catName) {
  const cat = CATEGORIES[catName];
  if (!cat) return null;

  const cmds = cat.cmds;
  const perPage = 20;
  const pages = [];
  for (let i = 0; i < cmds.length; i += perPage) {
    pages.push(cmds.slice(i, i + perPage));
  }

  const embed = new EmbedBuilder()
    .setTitle(`${cat.icon} ${catName.replace(/^.\s/, '')}`)
    .setColor(cat.color)
    .setDescription(
      `*${cat.desc}*\n\n` +
      pages[0].map((c, i) => {
        const num = String(i + 1).padStart(2, '0');
        return `\`${num}\` \`${c}\``;
      }).join('\n') +
      `\n\n**Page 1/${pages.length}** \u2022 \`${cmds.length}\` commands`
    )
    .setFooter({ text: `Use !help <command> for details \u2022 Page 1/${pages.length}` })
    .setTimestamp();

  return { embed, totalPages: pages.length, pages };
}

function buildPageEmbed(catName, page, allPages) {
  const cat = CATEGORIES[catName];
  if (!cat) return null;

  const cmds = allPages[page];
  const startNum = page * 20 + 1;

  const embed = new EmbedBuilder()
    .setTitle(`${cat.icon} ${catName.replace(/^.\s/, '')}`)
    .setColor(cat.color)
    .setDescription(
      `*${cat.desc}*\n\n` +
      cmds.map((c, i) => {
        const num = String(startNum + i).padStart(2, '0');
        return `\`${num}\` \`${c}\``;
      }).join('\n') +
      `\n\n**Page ${page + 1}/${allPages.length}** \u2022 \`${cat.cmds.length}\` commands`
    )
    .setFooter({ text: `Use !help <command> for details \u2022 Page ${page + 1}/${allPages.length}` })
    .setTimestamp();

  return embed;
}

function buildSelectMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_select')
      .setPlaceholder('Choose a command category...')
      .addOptions(
        CAT_NAMES.map(c => ({
          label: c.replace(/^.\s/, ''),
          description: CATEGORIES[c].desc.substring(0, 100),
          value: c,
          emoji: CATEGORIES[c].icon
        }))
      )
  );
}

function buildNavButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('help_home')
      .setLabel('Overview')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('help_prev')
      .setLabel('Previous')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('help_next')
      .setLabel('Next')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('help_stats')
      .setLabel('Server Stats')
      .setStyle(ButtonStyle.Success)
  );
}

function buildDisabledNavButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('help_home').setLabel('Overview').setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId('help_prev').setLabel('Previous').setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId('help_next').setLabel('Next').setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId('help_stats').setLabel('Server Stats').setStyle(ButtonStyle.Success).setDisabled(true)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all available commands or info about a specific command')
    .addStringOption(opt => opt.setName('command').setDescription('Command to get help for').setRequired(false)),
  cooldown: 3,
  aliases: ['h', 'commands', 'cmd'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const userId = interaction.user?.id || interaction.author?.id;
    const commands = interaction.client.commands;

    const cmdName = isSlash
      ? (interaction.options?.getString('command') || null)
      : (args && args[0] ? args[0].toLowerCase() : null);

    if (cmdName) {
      const cmd = commands.get(cmdName) || commands.find(c => c.aliases && c.aliases.includes(cmdName));
      if (!cmd) {
        return interaction.reply({ embeds: [
          new EmbedBuilder()
            .setTitle('Command Not Found')
            .setDescription(`No command found matching \`${cmdName}\`.`)
            .setColor(0xed4245)
        ] });
      }

      let category = 'Unknown';
      for (const [cat, data] of Object.entries(CATEGORIES)) {
        if (data.cmds.some(c => c === cmd.data.name || cmd.data.name.startsWith(c.split(' ')[0]))) {
          category = cat;
          break;
        }
      }

      const cat = CATEGORIES[category] || { icon: '◼️', color: 0x2f3136, desc: 'Unknown' };

      const embed = new EmbedBuilder()
        .setTitle(`${cat.icon} ${cmd.data.name}`)
        .setColor(cat.color)
        .setDescription(
          `${cmd.data.description || 'No description provided.'}\n\n` +
          `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\n` +
          `**Category:** \`${category.replace(/^.\s/, '')}\`\n` +
          `**Cooldown:** \`${cmd.cooldown || 3}s\`\n` +
          `**Usage:** \`!${cmd.data.name}\`\n` +
          (cmd.aliases && cmd.aliases.length > 0 ? `**Aliases:** ${cmd.aliases.map(a => `\`${a}\``).join(', ')}\n` : '') +
          (cmd.data.options && cmd.data.options.length > 0 ? `\n**Options:**\n${cmd.data.options.map(o => `\`${o.name}\` \u2014 ${o.description || 'No description'}`).join('\n')}` : '')
        )
        .setFooter({ text: `${interaction.client.user.username} \u2022 Use !help to see all commands` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    const homeEmbed = buildHomeEmbed(interaction.client);
    const selectMenu = buildSelectMenu();
    const navButtons = buildNavButtons();

    const response = await interaction.reply({
      embeds: [homeEmbed],
      components: [selectMenu, navButtons],
      fetchReply: true
    });

    const state = { category: null, page: 0, pages: null };

    const filter = (i) => i.user.id === userId;
    const collector = response.createMessageComponentCollector({ filter, time: 300000 });

    collector.on('collect', async (i) => {
      try {
        if (i.isStringSelectMenu() && i.customId === 'help_select') {
          const catName = i.values[0];
          const result = buildCategoryEmbed(catName);
          if (!result) return i.deferUpdate();

          state.category = catName;
          state.page = 0;
          state.pages = result.pages;

          await i.update({ embeds: [result.embed], components: [selectMenu, navButtons] });
          return;
        }

        if (i.isButton()) {
          if (i.customId === 'help_home') {
            state.category = null;
            state.page = 0;
            state.pages = null;
            await i.update({ embeds: [buildHomeEmbed(i.client)], components: [selectMenu, navButtons] });
            return;
          }

          if (i.customId === 'help_prev' && state.category && state.pages) {
            if (state.page > 0) {
              state.page--;
              const embed = buildPageEmbed(state.category, state.page, state.pages);
              await i.update({ embeds: [embed], components: [selectMenu, navButtons] });
            } else {
              await i.deferUpdate();
            }
            return;
          }

          if (i.customId === 'help_next' && state.category && state.pages) {
            if (state.page < state.pages.length - 1) {
              state.page++;
              const embed = buildPageEmbed(state.category, state.page, state.pages);
              await i.update({ embeds: [embed], components: [selectMenu, navButtons] });
            } else {
              await i.deferUpdate();
            }
            return;
          }

          if (i.customId === 'help_stats') {
            const guild = i.guild;
            const memberCount = guild ? guild.memberCount : 0;
            const onlineCount = guild ? guild.members.cache.filter(m => m.presence?.status !== 'offline').size : 0;
            const textChannels = guild ? guild.channels.cache.filter(c => c.type === 0).size : 0;
            const voiceChannels = guild ? guild.channels.cache.filter(c => c.type === 2).size : 0;
            const roles = guild ? guild.roles.cache.size : 0;
            const boostCount = guild ? guild.premiumSubscriptionCount || 0 : 0;

            const statsEmbed = new EmbedBuilder()
              .setTitle(`${i.client.user.username} - Server Stats`)
              .setColor(0x5865f2)
              .addFields(
                { name: 'Members', value: `\`${memberCount}\``, inline: true },
                { name: 'Online', value: `\`${onlineCount}\``, inline: true },
                { name: 'Text Channels', value: `\`${textChannels}\``, inline: true },
                { name: 'Voice Channels', value: `\`${voiceChannels}\``, inline: true },
                { name: 'Roles', value: `\`${roles}\``, inline: true },
                { name: 'Boosts', value: `\`${boostCount}\``, inline: true }
              )
              .setFooter({ text: 'Server Stats' })
              .setTimestamp();

            await i.update({ embeds: [statsEmbed], components: [selectMenu, navButtons] });
            return;
          }
        }

        await i.deferUpdate();
      } catch (err) {
        console.error('Help collector error:', err);
      }
    });

    collector.on('end', () => {
      response.edit({ components: [buildSelectMenu(), buildDisabledNavButtons()] }).catch(() => {});
    });
  }
};
