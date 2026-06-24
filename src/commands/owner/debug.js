const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('debug')
    .setDescription('Show debug information'),
  cooldown: 0,
  aliases: [],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
      try {
            const isSlash = interaction.isChatInputCommand?.() || false;
            const user = isSlash ? interaction.user : interaction.author;
            if (user.id !== config.ownerId) {
              return interaction.reply({ embeds: [errorEmbed('Only the bot owner can use this command.')] });
            }

            const uptime = formatUptime(interaction.client.uptime);
            const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
            const guildCount = interaction.client.guilds.cache.size;
            const userCount = interaction.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
            const commandCount = interaction.client.commands.size;
            const ping = interaction.client.ws.ping;

            const embed = new EmbedBuilder()
              .setColor(config.embedColors.info || '#3498DB')
              .setTitle('Debug Information')
              .addFields(
                { name: 'Uptime', value: uptime, inline: true },
                { name: 'Memory', value: `${memUsage} MB`, inline: true },
                { name: 'Ping', value: `${ping}ms`, inline: true },
                { name: 'Guilds', value: guildCount.toString(), inline: true },
                { name: 'Users', value: userCount.toString(), inline: true },
                { name: 'Commands', value: commandCount.toString(), inline: true },
                { name: 'Node.js', value: process.version, inline: true },
                { name: 'Platform', value: process.platform, inline: true }
              )
              .setTimestamp();

            await interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
}