const { EmbedBuilder } = require('discord.js');

function createEmbed(options) {
  return new EmbedBuilder()
    .setTitle(options.title || null)
    .setDescription(options.description || null)
    .setColor(options.color || 0x5865f2)
    .setTimestamp(options.timestamp ? new Date() : null)
    .setFooter(options.footer ? { text: options.footer } : null)
    .setAuthor(options.author ? { text: options.author } : null)
    .addFields(options.fields || []);
}

function successEmbed(title, description) {
  return createEmbed({ title, description, color: 0x00ff00, timestamp: true });
}

function errorEmbed(title, description) {
  return createEmbed({ title, description, color: 0xff0000, timestamp: true });
}

function warningEmbed(title, description) {
  return createEmbed({ title, description, color: 0xffff00, timestamp: true });
}

function infoEmbed(title, description) {
  return createEmbed({ title, description, color: 0x0099ff, timestamp: true });
}

function securityEmbed(title, description) {
  return createEmbed({ title, description, color: 0xff6600, timestamp: true });
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function parseDuration(str) {
  const regex = /^(\d+)(s|m|h|d)$/i;
  const match = str.match(regex);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function truncate(str, length) {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + '...';
}

function safeJsonParse(value, fallback) {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  if (value && typeof value === 'object') return value;
  return fallback;
}

module.exports = {
  createEmbed,
  successEmbed,
  errorEmbed,
  warningEmbed,
  infoEmbed,
  securityEmbed,
  formatNumber,
  formatDuration,
  parseDuration,
  chunkArray,
  truncate,
  safeJsonParse
};
