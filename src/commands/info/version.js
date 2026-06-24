const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('version')
    .setDescription('Check the bot version'),
  cooldown: 5,
  aliases: ['ver', 'botver'],
  prefix: true,
  async execute(interaction) {
      try {
            const embed = new EmbedBuilder()
              .setTitle('📌 Version Info')
              .setColor(config.embedColors?.info || 0x0099ff)
              .addFields(
                { name: 'Bot Version', value: '12.0.0', inline: true },
                { name: 'Discord.js', value: `v${require('discord.js').version}`, inline: true },
                { name: 'Node.js', value: process.version, inline: true },
                { name: 'Phase', value: '12', inline: true },
                { name: 'Commands', value: `${interaction.client.commands.size}`, inline: true },
                { name: 'Uptime', value: formatUptime(interaction.client.uptime), inline: true }
              )
              .setFooter({ text: 'Hacker Bot v12.0.0' })
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