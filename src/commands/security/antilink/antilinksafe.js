const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../../../utils/logger');

const SAFE_DOMAINS = [
  'youtube.com', 'youtu.be', 'google.com', 'github.com', 'discord.com', 'twitch.tv',
  'reddit.com', 'twitter.com', 'x.com', 'instagram.com', 'tiktok.com', 'spotify.com',
  'store.steampowered.com', 'steampowered.com', 'wikipedia.org', 'stackoverflow.com',
  'npmjs.com', 'npmjs.org', 'discordjs.guide', 'matrix.org', 'mozilla.org',
  'developer.mozilla.org', 'youtube.com', 'imgur.com', 'cdn.discordapp.com',
  'media.discordapp.net', 'files.catbox.moe', 'paste.ee', 'hastebin.com'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilinksafe')
    .setDescription('Check if a URL is safe')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName('url').setDescription('URL to check').setRequired(true)),

  cooldown: 3,
  aliases: ['alsafe', 'urlcheck', 'checkurl'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;

    const url = (isSlash ? interaction.options.getString('url') : args[0]);
    if (!url) return interaction.reply({ content: 'Provide a URL to check.', ephemeral: true });

    let domain = '';
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      domain = parsed.hostname.replace(/^www\./, '').toLowerCase();
    } catch (e) {
      return interaction.reply({ content: 'Invalid URL format.', ephemeral: true });
    }

    const isSafe = SAFE_DOMAINS.some(d => domain === d || domain.endsWith(`.${d}`));

    const phishingPatterns = [
      /discord\.(gg|com)\/(nitro|free|gift|airdrop)/gi,
      /free-nitro/gi, /claim.*reward/gi, /verify.*account/gi,
      /token.*grab/gi, /steamcommunity\.com.*tradeoffer/gi
    ];

    let phishingDetected = false;
    for (const pattern of phishingPatterns) {
      if (pattern.test(url)) { phishingDetected = true; break; }
    }

    const hasSuspiciousTLD = /\.(tk|ml|ga|cf|gq|xyz|top|club|online|site|tech|fun|icu|buzz|monster)$/i.test(domain);
    const hasIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain);
    const hasSubdomain = (domain.match(/\./g) || []).length > 2;
    const hasAtSign = url.includes('@');

    let riskLevel = 'low';
    let reasons = [];

    if (phishingDetected) { riskLevel = 'critical'; reasons.push('Known phishing pattern'); }
    if (hasIP) { riskLevel = 'high'; reasons.push('Uses IP address instead of domain'); }
    if (hasSuspiciousTLD) { riskLevel = 'high'; reasons.push('Suspicious TLD'); }
    if (hasAtSign) { riskLevel = 'high'; reasons.push('Contains @ symbol (URL obfuscation)'); }
    if (hasSubdomain && !isSafe) { riskLevel = 'medium'; reasons.push('Multiple subdomains'); }

    const colors = { low: 0x00ff00, medium: 0xffff00, high: 0xff8800, critical: 0xff0000 };
    const embed = new EmbedBuilder()
      .setColor(isSafe ? 0x00ff00 : (colors[riskLevel] || 0xffa500))
      .setTitle('URL Safety Check')
      .addFields(
        { name: 'URL', value: `\`${url}\``, inline: false },
        { name: 'Domain', value: `\`${domain}\``, inline: true },
        { name: 'Safe Domain', value: isSafe ? 'Yes' : 'No', inline: true },
        { name: 'Risk Level', value: riskLevel.toUpperCase(), inline: true },
        { name: 'Phishing', value: phishingDetected ? 'DETECTED' : 'None', inline: true }
      )
      .setTimestamp();

    if (reasons.length > 0) {
      embed.addFields({ name: 'Warnings', value: reasons.map(r => `• ${r}`).join('\n') });
    }

    if (isSafe) {
      embed.addFields({ name: 'Result', value: 'This URL is from a known safe domain.' });
    } else if (riskLevel === 'critical') {
      embed.addFields({ name: 'Result', value: 'BLOCK this URL immediately. Known phishing pattern detected.' });
    } else if (riskLevel === 'high') {
      embed.addFields({ name: 'Result', value: 'This URL is suspicious. Consider blocking.' });
    } else {
      embed.addFields({ name: 'Result', value: 'This URL is not from a known safe domain. Review manually.' });
    }

    embed.setFooter({ text: `Checked by ${user.tag}` });
    return interaction.reply({ embeds: [embed] });
  }
};
