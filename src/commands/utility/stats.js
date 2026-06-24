const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { formatNumber, formatDuration } = require('../../utils/helpers');
const os = require('os');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Shows bot statistics, system info, and credits'),
  cooldown: 5,
  aliases: ['statistics', 'botstats', 'sys'],
  prefix: true,
  async execute(interaction) {
    try {
      const client = interaction.client;
      const uptime = formatDuration(client.uptime);
      const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
      const memTotal = (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(1);
      const memRSS = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
      const guildCount = client.guilds.cache.size;
      const userCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
      const channelCount = client.channels.cache.size;
      const commandCount = client.commands.size;
      const ping = Math.round(client.ws.ping);
      const cpuUsage = process.cpuUsage();
      const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000).toFixed(1);
      const cpuCount = os.cpus().length;
      const totalMem = (os.totalmem() / 1024 / 1024).toFixed(0);
      const freeMem = (os.freemem() / 1024 / 1024).toFixed(0);
      const statusEmoji = ping < 100 ? '🟢' : ping < 200 ? '🟡' : '🔴';

      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription(
          `**${client.user.username}** — System Statistics\n\n` +
          `**Developer**\n` +
          `> Made by **Aarav Hacker**\n` +
          `> Website • Commands • Music • Dashboard\n` +
          `> Motivated by **ChocolateBoi** & **Kiko**`
        )
        .addFields(
          {
            name: `General`,
            value: `> Servers: **${formatNumber(guildCount)}**\n> Users: **${formatNumber(userCount)}**\n> Channels: **${formatNumber(channelCount)}**\n> Commands: **${commandCount}**`,
            inline: true
          },
          {
            name: `Performance`,
            value: `> Ping: ${statusEmoji} **${ping}ms**\n> Memory: **${memUsage} MB**\n> Heap: **${memTotal} MB**\n> RSS: **${memRSS} MB**`,
            inline: true
          },
          {
            name: `\u200b`,
            value: `\u200b`,
            inline: true
          },
          {
            name: `Runtime`,
            value: `> Node.js: **${process.version}**\n> Discord.js: **v${require('discord.js').version}**\n> Platform: **${process.platform}**\n> Arch: **${process.arch}**`,
            inline: true
          },
          {
            name: `Uptime`,
            value: `> Bot: **${uptime}**\n> Process: **${formatDuration(process.uptime() * 1000)}**\n> System: **${formatDuration(os.uptime() * 1000)}**`,
            inline: true
          },
          {
            name: `\u200b`,
            value: `\u200b`,
            inline: true
          },
          {
            name: `Hardware`,
            value: `> CPU Cores: **${cpuCount}**\n> CPU Usage: **${cpuPercent}%**\n> Total RAM: **${totalMem} MB**\n> Free RAM: **${freeMem} MB**`,
            inline: true
          },
          {
            name: `Bot Info`,
            value: `> Name: **${client.user.username}**\n> ID: **${client.user.id}**\n> Owner: **Aarav Hacker**`,
            inline: true
          },
          {
            name: `\u200b`,
            value: `\u200b`,
            inline: true
          },
          {
            name: `Tech Stack`,
            value: `> Runtime: **Node.js ${process.version}**\n> Library: **discord.js v${require('discord.js').version}**\n> Music: **Lavalink**\n> Database: **SQLite**`,
            inline: false
          }
        )
        .setFooter({ text: `${client.user.username} • ${interaction.author?.tag || interaction.user?.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Stats command error:', err);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff4444)
        .setDescription('An error occurred while executing this command.');
      interaction.reply({ embeds: [errorEmbed] }).catch(() => {});
    }
  }
};
