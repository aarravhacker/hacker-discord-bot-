const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bot')
    .setDescription('Get bot info and stats'),
  cooldown: 5,
  aliases: ['info', 'bi', 'botinfo'],
  prefix: true,
  async execute(interaction) {
      try {
            const uptime = formatUptime(interaction.client.uptime);
            const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
            const guildCount = interaction.client.guilds.cache.size;
            const userCount = interaction.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);

            const embed = new EmbedBuilder()
              .setTitle(`${interaction.client.user.username}`)
              .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
              .setColor(config.embedColors?.info || 0x0099ff)
              .addFields(
                { name: 'Guilds', value: `${guildCount}`, inline: true },
                { name: 'Users', value: `${userCount.toLocaleString()}`, inline: true },
                { name: 'Uptime', value: uptime, inline: true },
                { name: 'Memory', value: `${memUsage} MB`, inline: true },
                { name: 'Commands', value: `${interaction.client.commands.size}`, inline: true },
                { name: 'Ping', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true }
              )
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