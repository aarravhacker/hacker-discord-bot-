const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Get information about the bot'),
  cooldown: 5,
  aliases: ['bi', 'botstats'],
  prefix: true,
  async execute(interaction) {
      try {
            const uptime = formatUptime(interaction.client.uptime);
            const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
            const guildCount = interaction.client.guilds.cache.size;
            const userCount = interaction.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
            const channelCount = interaction.client.channels.cache.size;
            const ping = Math.round(interaction.client.ws.ping);

            const embed = new EmbedBuilder()
              .setTitle('🤖 Bot Information')
              .setColor(config.embedColors?.info || 0x0099ff)
              .addFields(
                { name: '📊 Statistics', value: [
                  `**Guilds:** ${guildCount}`,
                  `**Users:** ${userCount.toLocaleString()}`,
                  `**Channels:** ${channelCount.toLocaleString()}`
                ].join('\n'), inline: true },
                { name: '⚙️ System', value: [
                  `**Uptime:** ${uptime}`,
                  `**Memory:** ${memUsage} MB`,
                  `**Ping:** ${ping}ms`,
                  `**Node:** ${process.version}`
                ].join('\n'), inline: true },
                { name: '💻 Runtime', value: [
                  `**Platform:** ${process.platform}`,
                  `**Discord.js:** v${require('discord.js').version}`,
                  `**Commands:** ${interaction.client.commands.size}`
                ].join('\n'), inline: true }
              )
              .setFooter({ text: 'Hacker Bot' })
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}