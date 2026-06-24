const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { formatNumber, formatDuration, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Shows detailed information about the bot'),
  cooldown: 5,
  aliases: ['bi', 'about'],
  prefix: true,
  async execute(interaction) {
      try {
            const client = interaction.client;
            const owner = await client.users.fetch(client.ownerId || client.user.id).catch(() => null);
            const uptime = formatDuration(client.uptime);
            const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

            const embed = new EmbedBuilder()
              .setTitle(client.user.tag)
              .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
              .setColor(config.embedColors.info)
              .addFields(
                { name: 'Owner', value: owner ? owner.tag : 'Unknown', inline: true },
                { name: 'Servers', value: formatNumber(client.guilds.cache.size), inline: true },
                { name: 'Users', value: formatNumber(client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)), inline: true },
                { name: 'Uptime', value: uptime, inline: true },
                { name: 'Memory', value: `${memUsage} MB`, inline: true },
                { name: 'Ping', value: `${Math.round(client.ws.ping)}ms`, inline: true },
                { name: 'Node.js', value: process.version, inline: true },
                { name: 'Discord.js', value: require('discord.js').version, inline: true },
                { name: 'Commands', value: `${client.commands.size}`, inline: true }
              )
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};