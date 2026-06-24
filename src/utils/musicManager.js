const { Shoukaku, Connectors } = require('shoukaku');
const lavalinkConfig = require('../config/lavalink');
const voice = require('@discordjs/voice');
const { spawn } = require('child_process');
const path = require('path');

let shoukaku = null;
let discordClient = null;
const loggedErrors = new Set();
const connectedNodes = new Set();
const queues = new Map();
const voiceConnections = new Map();
const audioPlayers = new Map();
const guildFilters = new Map();
const guildSettings = new Map();
const playbackStartedAt = new Map();

const LAVALINK_STATE = { CONNECTING: 0, CONNECTED: 1, DISCONNECTED: 2, DESTROYED: 3 };
const FFMPEG_PATH = path.join(__dirname, '..', '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');

const FILTER_MAP = {
  bassboost: (val) => `bass=g=${val}:f=110:w=0.6`,
  nightcore: () => `asetrate=44100*1.25,atempo=0.8`,
  vaporwave: () => `asetrate=44100*0.8,atempo=1.25`,
  earrape: () => `volume=8`,
  '8d': () => `apulsator=mode=sine:hz=0.1`,
  karaoke: () => `stereotools=mlev=0.3:phm=0.5`,
  tremolo: () => `tremolo=f=5:d=0.5`,
  vibrato: () => `vibrato=f=5:d=0.5`,
  radio: () => `highpass=f=300,lowpass=f=3000,treble=g=5`,
  echo: () => `aecho=0.8:0.88:60:0.4`,
  reverb: () => `freeverb=roomsize=0.8:damp=0.5:wet=0.3`,
  phaser: () => `aphaser=type=t:speed=2:decay=0.4`,
  flanger: () => `flanger=delay=10:depth=5:regen=50:width=100:speed=0.5`,
  chorus: () => `chorus=0.5:0.9:50|60|40:0.4|0.32|0.3:0.25|0.4|0.3:2|2.3|1.3`,
  speed: (val) => `atempo=${val}`,
  pitch: (val) => `asetrate=44100*${val},atempo=${1/val}`,
};

class TrackQueue {
  constructor() {
    this.tracks = [];
    this.current = null;
    this.loop = 'none';
    this.history = [];
  }

  add(track) { this.tracks.push(track); }

  next() {
    if (this.tracks.length === 0) { this.current = null; return null; }
    this.current = this.tracks.shift();
    return this.current;
  }

  peek() { return this.tracks[0] || null; }

  remove(index) {
    if (index >= 0 && index < this.tracks.length) return this.tracks.splice(index, 1)[0];
    return null;
  }

  clear() { this.tracks = []; this.current = null; }

  shuffle() {
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }
  }

  get length() { return this.tracks.length; }
  get isEmpty() { return this.tracks.length === 0 && !this.current; }
}

function getQueue(guildId) {
  if (!queues.has(guildId)) queues.set(guildId, new TrackQueue());
  return queues.get(guildId);
}

function deleteQueue(guildId) { queues.delete(guildId); }

function initMusic(client) {
  discordClient = client;

  shoukaku = new Shoukaku(
    new Connectors.DiscordJS(client),
    lavalinkConfig.nodes,
    {
      moveEvent: 'PLAYER_UPDATE',
      resumeKey: `hacker-bot-${client.user?.id || 'default'}`,
      resumeTimeout: 300000,
      retryTimeout: lavalinkConfig.retryTimeout || 30000,
      retryCount: lavalinkConfig.retryCount || 5
    }
  );

  shoukaku.on('ready', (name) => {
    connectedNodes.add(name);
    loggedErrors.clear();
    console.log(`[Music] Lavalink node "${name}" connected (track resolution only)`);
  });

  shoukaku.on('error', (name, error) => {
    if (error.message && !error.message.includes('Websocket closed')) {
      const errorKey = `${name}:${error.message}`;
      if (!loggedErrors.has(errorKey)) {
        loggedErrors.add(errorKey);
        console.error(`[Music] Node "${name}" error:`, error.message);
      }
    }
  });

  shoukaku.on('disconnect', (name, reason) => {
    connectedNodes.delete(name);
    if (reason && reason.code !== 1000) {
      console.warn(`[Music] Node "${name}" disconnected (code ${reason.code})`);
    }
  });

  shoukaku.on('close', (name) => {
    connectedNodes.delete(name);
    console.log(`[Music] Node "${name}" connection closed`);
  });

  console.log('[Music] Initialized with @discordjs/voice for audio streaming');
  return shoukaku;
}

async function resolveStreamUrl(url) {
  return new Promise((resolve) => {
    const proc = spawn('python', ['-m', 'yt_dlp', '-f', 'bestaudio/best', '--no-check-certificates', '-g', url], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim());
      } else {
        console.log(`[Music] yt-dlp resolve failed: ${stderr.substring(0, 200)}`);
        resolve(url);
      }
    });
    proc.on('error', () => resolve(url));
  });
}

function getFilterArgs(guildId) {
  const filters = guildFilters.get(guildId);
  if (!filters || filters.length === 0) return [];
  const afParts = [];
  for (const f of filters) {
    if (f.type === 'speed') afParts.push(FILTER_MAP.speed(f.value));
    else if (f.type === 'pitch') afParts.push(FILTER_MAP.pitch(f.value));
    else if (f.type === 'bassboost') afParts.push(FILTER_MAP.bassboost(f.value));
    else if (FILTER_MAP[f.type]) afParts.push(typeof FILTER_MAP[f.type] === 'function' ? FILTER_MAP[f.type]() : FILTER_MAP[f.type]);
  }
  if (afParts.length === 0) return [];
  return ['-af', afParts.join(',')];
}

function createStreamResource(url, guildId, seekMs) {
  return new Promise((resolve, reject) => {
    const filterArgs = guildId ? getFilterArgs(guildId) : [];
    const ffArgs = [
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5',
      '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ];
    if (seekMs && seekMs > 0) {
      const seekSec = (seekMs / 1000).toFixed(3);
      ffArgs.push('-ss', seekSec);
    }
    ffArgs.push('-i', url);
    ffArgs.push(...filterArgs);
    ffArgs.push(
      '-analyzeduration', '0',
      '-loglevel', 'error',
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
      'pipe:1'
    );
    const ffmpeg = spawn(FFMPEG_PATH, ffArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stderr = '';
    ffmpeg.stderr.on('data', (d) => { stderr += d.toString(); });

    ffmpeg.on('error', (err) => {
      console.error('[Music] FFmpeg error:', err.message);
      reject(err);
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        console.error(`[Music] FFmpeg exited with code ${code}: ${stderr}`);
      }
    });

    const resource = voice.createAudioResource(ffmpeg.stdout, {
      inputType: voice.StreamType.Raw,
      inlineVolume: true
    });

    resource.playStream.on('error', (err) => {
      console.error('[Music] Stream error:', err.message);
    });

    resolve({ resource, ffmpeg });
  });
}

async function joinVoiceChannel(guild, voiceChannel) {
  if (!discordClient) throw new Error('Music system not initialized');

  const existing = voiceConnections.get(guild.id);
  if (existing) {
    return { connection: existing, player: audioPlayers.get(guild.id) };
  }

  console.log(`[Music] Joining voice channel ${voiceChannel.id} in guild ${guild.id} via @discordjs/voice`);

  const connection = voice.joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: false
  });

  connection.on(voice.VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        voice.entersState(connection, voice.VoiceConnectionStatus.Signalling, 5000),
        voice.entersState(connection, voice.VoiceConnectionStatus.Connecting, 5000)
      ]);
    } catch {
      console.log(`[Music] Voice disconnected from guild ${guild.id}, destroying`);
      destroyPlayer(guild.id);
    }
  });

  connection.on(voice.VoiceConnectionStatus.Destroyed, () => {
    console.log(`[Music] Voice connection destroyed for guild ${guild.id}`);
    voiceConnections.delete(guild.id);
    audioPlayers.delete(guild.id);
  });

  const player = voice.createAudioPlayer({
    behaviors: {
      noSubscriber: voice.NoSubscriberBehavior.Play
    }
  });

  player.on(voice.AudioPlayerStatus.Playing, () => {
    console.log(`[Music] AudioPlayer playing for guild ${guild.id}`);
  });

  player.on(voice.AudioPlayerStatus.Idle, () => {
    console.log(`[Music] AudioPlayer idle for guild ${guild.id}`);
    const queue = getQueue(guild.id);
    if (queue.loop === 'track' && queue.current) {
      playTrackFromUrl(guild.id, queue.current).catch(err => {
        console.error('[Music] Failed to replay track:', err.message);
      });
    } else {
      if (queue.current) {
        if (queue.loop === 'queue') {
          queue.add(queue.current);
        }
        queue.history.push(queue.current);
        if (queue.history.length > 50) queue.history.shift();
      }
      queue.current = null;
      const nextTrack = queue.next();
      if (nextTrack) {
        playTrackFromUrl(guild.id, nextTrack).catch(err => {
          console.error('[Music] Failed to play next track:', err.message);
        });
      }
    }
  });

  player.on('error', (err) => {
    console.error(`[Music] AudioPlayer error for guild ${guild.id}:`, err.message);
  });

  connection.subscribe(player);
  voiceConnections.set(guild.id, connection);
  audioPlayers.set(guild.id, player);

  await voice.entersState(connection, voice.VoiceConnectionStatus.Ready, 20_000).catch(() => {});

  console.log(`[Music] Voice ready for guild ${guild.id}`);
  return { connection, player };
}

async function playTrackFromUrl(guildId, track) {
  const trackUrl = track.info?.uri || track.uri;
  if (!trackUrl) throw new Error('No track URL found');

  const player = audioPlayers.get(guildId);
  if (!player) throw new Error('No audio player for this guild');

  const queue = getQueue(guildId);
  queue.current = track;

  console.log(`[Music] Resolving stream for: ${track.info?.title || 'Unknown'}`);
  const streamUrl = await resolveStreamUrl(trackUrl);

  if (!streamUrl || streamUrl === trackUrl) {
    console.log(`[Music] Direct URL failed, trying FFmpeg with URL`);
  }

  const { resource, ffmpeg } = await createStreamResource(streamUrl, guildId, 0);
  player.play(resource);
  playbackStartedAt.set(guildId, Date.now());

  resource.playStream.on('end', () => {
    console.log(`[Music] Stream ended for: ${track.info?.title || 'Unknown'}`);
  });

  console.log(`[Music] Now streaming: ${track.info?.title || 'Unknown'}`);
}

async function playTrack(guildId, track) {
  await playTrackFromUrl(guildId, track);
}

function destroyPlayer(guildId) {
  const player = audioPlayers.get(guildId);
  if (player) player.stop();
  const conn = voiceConnections.get(guildId);
  if (conn) {
    try { conn.destroy(); } catch (e) {}
  }
  deleteQueue(guildId);
  voiceConnections.delete(guildId);
  audioPlayers.delete(guildId);
}

function getShoukaku() { return shoukaku; }

function getNode() {
  if (!shoukaku) return null;
  return shoukaku.nodes.get('Main') || [...shoukaku.nodes.values()][0] || null;
}

function isNodeReady() {
  const node = getNode();
  return node && node.state === LAVALINK_STATE.CONNECTED;
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return h > 0
    ? `${h}:${(m % 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
    : `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function getMember(interaction, isSlash) {
  if (isSlash) return interaction.member;
  return interaction.guild?.members?.cache?.get(interaction.author?.id);
}

function getUser(interaction, isSlash) {
  if (isSlash) return interaction.user;
  return interaction.author;
}

function isSlashCommand(interaction) {
  return typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
}

function getQuery(interaction, args, isSlash) {
  if (isSlash) return interaction.options?.getString('query');
  return args?.join(' ');
}

async function searchTrack(query, source = 'ytsearch') {
  if (query.startsWith('http://') || query.startsWith('https://')) {
    const track = await resolveTrackFromUrl(query);
    if (track) return [track];
  }

  const tracks = await searchWithYtDlp(query);
  if (tracks.length > 0) return tracks;

  const node = getNode();
  if (node) {
    try {
      let result = await node.rest.resolve(`scsearch:${query}`);
      let lTracks = extractTracks(result);
      if (lTracks.length > 0) return lTracks;
      result = await node.rest.resolve(`ytsearch:${query}`);
      lTracks = extractTracks(result);
      if (lTracks.length > 0) return lTracks;
    } catch (e) { /* Lavalink fallback failed */ }
  }

  return [];
}

async function searchWithYtDlp(query) {
  return new Promise((resolve) => {
    const searchQuery = `ytsearch5:${query}`;
    const proc = spawn('python', ['-m', 'yt_dlp', '--flat-playlist', '-j', searchQuery], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code !== 0 || !stdout.trim()) {
        resolve([]);
        return;
      }
      const tracks = stdout.trim().split('\n').filter(Boolean).map(line => {
        try {
          const data = JSON.parse(line);
          return {
            encoded: data.id || data.url,
            info: {
              identifier: data.id,
              isSeekable: true,
              author: data.uploader || data.channel || 'Unknown',
              length: (data.duration || 0) * 1000,
              isStream: false,
              position: 0,
              title: data.title || 'Unknown',
              uri: data.url || data.webpage_url || `https://www.youtube.com/watch?v=${data.id}`,
              sourceName: 'Lavalink',
              artworkUrl: data.thumbnail || null
            }
          };
        } catch (e) { return null; }
      }).filter(Boolean);
      resolve(tracks);
    });
    proc.on('error', () => resolve([]));
  });
}

async function resolveTrackFromUrl(url) {
  return new Promise((resolve) => {
    const proc = spawn('python', ['-m', 'yt_dlp', '-j', url], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => {});
    proc.on('close', (code) => {
      if (code !== 0 || !stdout.trim()) { resolve(null); return; }
      try {
        const data = JSON.parse(stdout.trim());
        resolve({
          encoded: data.id || data.url,
          info: {
            identifier: data.id,
            isSeekable: true,
            author: data.uploader || data.channel || 'Unknown',
            length: (data.duration || 0) * 1000,
            isStream: false,
            position: 0,
            title: data.title || 'Unknown',
            uri: data.webpage_url || data.url || url,
              sourceName: 'Lavalink',
            artworkUrl: data.thumbnail || null
          }
        });
      } catch (e) { resolve(null); }
    });
    proc.on('error', () => resolve(null));
  });
}

function extractTracks(result) {
  if (!result) return [];
  if (result.loadType === 'track' && result.data) return [result.data];
  if (result.loadType === 'search' && Array.isArray(result.data)) return result.data;
  if (result.loadType === 'search_result' && Array.isArray(result.tracks)) return result.tracks;
  if (result.loadType === 'playlist' && result.data?.tracks) return result.data.tracks;
  if (result.loadType === 'playlist_loaded' && Array.isArray(result.tracks)) return result.tracks;
  if (Array.isArray(result.data)) return result.data;
  if (Array.isArray(result.tracks)) return result.tracks;
  return [];
}

function pauseTrack(guildId) {
  const player = audioPlayers.get(guildId);
  if (player) player.pause();
}

function resumeTrack(guildId) {
  const player = audioPlayers.get(guildId);
  if (player) player.unpause();
}

function stopPlayback(guildId) {
  const player = audioPlayers.get(guildId);
  if (player) {
    player.stop();
  }
  const queue = getQueue(guildId);
  queue.clear();
  queue.current = null;
}

function isPlaying(guildId) {
  const player = audioPlayers.get(guildId);
  return player && player.state.status === voice.AudioPlayerStatus.Playing;
}

function isPaused(guildId) {
  const player = audioPlayers.get(guildId);
  return player && player.state.status === voice.AudioPlayerStatus.Paused;
}

function getPlayerStatus(guildId) {
  const player = audioPlayers.get(guildId);
  return player ? player.state.status : null;
}

function addFilter(guildId, type, value) {
  if (!guildFilters.has(guildId)) guildFilters.set(guildId, []);
  const filters = guildFilters.get(guildId);
  const existing = filters.findIndex(f => f.type === type);
  if (existing >= 0) filters[existing] = { type, value };
  else filters.push({ type, value });
}

function removeFilter(guildId, type) {
  const filters = guildFilters.get(guildId);
  if (!filters) return;
  const idx = filters.findIndex(f => f.type === type);
  if (idx >= 0) filters.splice(idx, 1);
  if (filters.length === 0) guildFilters.delete(guildId);
}

function getFilters(guildId) {
  return guildFilters.get(guildId) || [];
}

function clearFilters(guildId) {
  guildFilters.delete(guildId);
}

function hasFilter(guildId, type) {
  const filters = guildFilters.get(guildId);
  return filters ? filters.some(f => f.type === type) : false;
}

async function reapplyCurrentTrack(guildId) {
  const queue = getQueue(guildId);
  if (!queue.current) return;
  const player = audioPlayers.get(guildId);
  if (!player) return;
  const trackUrl = queue.current.info?.uri || queue.current.uri;
  if (!trackUrl) return;

  const startedAt = playbackStartedAt.get(guildId) || Date.now();
  const elapsed = Date.now() - startedAt;

  console.log(`[Music] Reapplying filters at ${Math.floor(elapsed / 1000)}s`);
  const streamUrl = await resolveStreamUrl(trackUrl);
  const { resource } = await createStreamResource(streamUrl, guildId, elapsed);
  player.play(resource);
  playbackStartedAt.set(guildId, Date.now() - elapsed);
}

function toggle247(guildId) {
  const current = get247(guildId);
  set247(guildId, !current);
  return !current;
}

function toggleAutoplay(guildId) {
  const current = getAutoplay(guildId);
  setAutoplay(guildId, !current);
  return !current;
}

function clearQueue(guildId) {
  const queue = getQueue(guildId);
  queue.clear();
}

function get247(guildId) {
  const settings = guildSettings.get(guildId) || {};
  return settings.twoFourSeven || false;
}

function set247(guildId, val) {
  if (!guildSettings.has(guildId)) guildSettings.set(guildId, {});
  guildSettings.get(guildId).twoFourSeven = val;
}

function getAutoplay(guildId) {
  const settings = guildSettings.get(guildId) || {};
  return settings.autoplay || false;
}

function setAutoplay(guildId, val) {
  if (!guildSettings.has(guildId)) guildSettings.set(guildId, {});
  guildSettings.get(guildId).autoplay = val;
}

function getShuffle(guildId) {
  const settings = guildSettings.get(guildId) || {};
  return settings.shuffle || false;
}

function setShuffle(guildId, val) {
  if (!guildSettings.has(guildId)) guildSettings.set(guildId, {});
  guildSettings.get(guildId).shuffle = val;
}

function connect(guildId, channelId) {
  const guild = discordClient?.guilds?.cache?.get(guildId);
  if (!guild) throw new Error('Guild not found');
  const channel = guild.channels?.cache?.get(channelId);
  if (!channel) throw new Error('Channel not found');
  return joinVoiceChannel(guild, channel);
}

function getCurrentTrack(guildId) {
  const queue = getQueue(guildId);
  return queue.current || null;
}

function getPlayer(guildId) {
  const player = audioPlayers.get(guildId);
  if (!player) return null;
  const queue = getQueue(guildId);
  const filters = getFilters(guildId);
  return {
    playing: player.state.status === voice.AudioPlayerStatus.Playing,
    paused: player.state.status === voice.AudioPlayerStatus.Paused,
    volume: 100,
    currentTrack: queue.current,
    twentyFourSeven: get247(guildId),
    autoplay: getAutoplay(guildId),
    filters: filters.map(f => f.type)
  };
}

function addToQueue(guildId, track) {
  const queue = getQueue(guildId);
  queue.add(track);
}

function pushToFront(guildId, track) {
  const queue = getQueue(guildId);
  queue.tracks.unshift(track);
}

function seek(guildId, positionMs) {
  const queue = getQueue(guildId);
  if (!queue.current) throw new Error('Nothing is playing');
  const trackUrl = queue.current.info?.uri || queue.current.uri;
  if (!trackUrl) throw new Error('No track URL');
  const player = audioPlayers.get(guildId);
  if (!player) throw new Error('No player');
  reapplyCurrentTrack(guildId);
}

function switchNode(guildId, nodeName) {
  if (!shoukaku) throw new Error('Music system not initialized');
  const node = shoukaku.nodes.get(nodeName);
  if (!node) throw new Error(`Node "${nodeName}" not found`);
  return true;
}

function setVolume(guildId, level) {
  const player = audioPlayers.get(guildId);
  if (!player) throw new Error('No player');
}

function togglePreset(guildId, name) {
  const EQ_PRESETS = {
    bass: { equalizer: [
      { band: 0, gain: 0.6 }, { band: 1, gain: 0.7 }, { band: 2, gain: 0.8 },
      { band: 3, gain: 0.5 }, { band: 4, gain: 0.3 }, { band: 5, gain: 0.1 }
    ]},
    flat: { equalizer: [
      { band: 0, gain: 0 }, { band: 1, gain: 0 }, { band: 2, gain: 0 },
      { band: 3, gain: 0 }, { band: 4, gain: 0 }, { band: 5, gain: 0 }
    ]},
    vocal: { equalizer: [
      { band: 0, gain: -0.2 }, { band: 1, gain: 0 }, { band: 2, gain: 0.5 },
      { band: 3, gain: 0.7 }, { band: 4, gain: 0.3 }, { band: 5, gain: -0.2 }
    ]},
    treble: { equalizer: [
      { band: 0, gain: -0.5 }, { band: 1, gain: -0.3 }, { band: 2, gain: 0 },
      { band: 3, gain: 0.4 }, { band: 4, gain: 0.7 }, { band: 5, gain: 0.9 }
    ]}
  };
  if (EQ_PRESETS[name]) {
    addFilter(guildId, name, 10);
  } else {
    addFilter(guildId, name, 10);
  }
}

function setEqualizer(guildId, preset) {
  togglePreset(guildId, preset);
}

function toggleSource(guildId, name) {
  if (hasFilter(guildId, name)) {
    removeFilter(guildId, name);
  } else {
    addFilter(guildId, name, 10);
  }
}

async function forceFix(guildId) {
  await reapplyCurrentTrack(guildId);
}

module.exports = {
  initMusic,
  getShoukaku,
  getNode,
  isNodeReady,
  formatDuration,
  getMember,
  getUser,
  isSlashCommand,
  getQuery,
  searchTrack,
  joinVoiceChannel,
  playTrack,
  destroyPlayer,
  getQueue,
  deleteQueue,
  TrackQueue,
  pauseTrack,
  resumeTrack,
  stopPlayback,
  isPlaying,
  isPaused,
  getPlayerStatus,
  addFilter,
  removeFilter,
  getFilters,
  clearFilters,
  hasFilter,
  reapplyCurrentTrack,
  get247,
  set247,
  getAutoplay,
  setAutoplay,
  getShuffle,
  setShuffle,
  toggle247,
  toggleAutoplay,
  clearQueue,
  connect,
  getCurrentTrack,
  getPlayer,
  addToQueue,
  pushToFront,
  seek,
  switchNode,
  setVolume,
  togglePreset,
  setEqualizer,
  toggleSource,
  forceFix
};
