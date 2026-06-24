const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show bot status and stats'),
  cooldown: 5,
  aliases: ['botinfo', 'info', 'ping'],
  prefix: true,

  async execute(interaction, args) {
    const client = interaction.client;

    const uptime = formatUptime(client.uptime);
    const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const memTotal = (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2);

    const embed = new EmbedBuilder()
      .setColor('#00ff99')
      .setTitle('Bot Status')
      .addFields(
        { name: 'Uptime', value: uptime, inline: true },
        { name: 'Memory', value: `${memUsage} / ${memTotal} MB`, inline: true },
        { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
        { name: 'Users', value: `${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`, inline: true },
        { name: 'Channels', value: `${client.channels.cache.size}`, inline: true },
        { name: 'Ping', value: `${client.ws.ping}ms`, inline: true },
        { name: 'Node.js', value: process.version, inline: true },
        { name: 'Discord.js', value: require('discord.js').version, inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(' ');
}
