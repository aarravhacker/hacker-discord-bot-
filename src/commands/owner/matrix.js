const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('matrix')
    .setDescription('View bot internals and detailed stats'),
  cooldown: 0,
  aliases: ['mx'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;

    if (user.id !== config.ownerId) return;

    const client = interaction.client;
    const mem = process.memoryUsage();

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('MATRIX - Bot Internals')
      .setDescription('```ansi\n' +
        `\u001b[1;32mPROCESS INFORMATION\u001b[0m\n` +
        `  PID:        ${process.pid}\n` +
        `  Uptime:     ${formatUptime(process.uptime())}\n` +
        `  Platform:   ${process.platform} ${process.arch}\n` +
        `  Node:       ${process.version}\n\n` +
        `\u001b[1;36mMEMORY USAGE\u001b[0m\n` +
        `  Heap Used:  ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
        `  Heap Total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB\n` +
        `  RSS:        ${(mem.rss / 1024 / 1024).toFixed(2)} MB\n` +
        `  External:   ${(mem.external / 1024 / 1024).toFixed(2)} MB\n\n` +
        `\u001b[1;33mDISCORD CONNECTION\u001b[0m\n` +
        `  Ping:       ${client.ws.ping}ms\n` +
        `  Status:     ${client.ws.ready ? 'Connected' : 'Disconnected'}\n` +
        `  Shard:      ${(client.ws.shard?.id || 0) + 1}/${client.ws.shard?.count || 1}\n` +
        '```')
      .addFields(
        { name: 'Guilds', value: `\`${client.guilds.cache.size}\``, inline: true },
        { name: 'Users', value: `\`${client.users.cache.size}\``, inline: true },
        { name: 'Channels', value: `\`${client.channels.cache.size}\``, inline: true },
        { name: 'Commands', value: `\`${client.commands.size}\``, inline: true },
        { name: 'Emojis', value: `\`${client.emojis.cache.size}\``, inline: true },
        { name: 'Roles', value: `\`${client.guilds.cache.reduce((a, g) => a + g.roles.cache.size, 0)}\``, inline: true }
      )
      .setFooter({ text: 'MATRIX v1.0 - Bot Internals' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}
