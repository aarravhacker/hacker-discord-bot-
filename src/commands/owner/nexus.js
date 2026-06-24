const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nexus')
    .setDescription('Hacker Bot systems panel - view all bot modules'),
  cooldown: 0,
  aliases: ['nx'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;

    if (user.id !== config.ownerId) return;

    const client = interaction.client;

    const systems = [
      { name: 'Commands', status: client.commands.size > 0 ? 'ONLINE' : 'OFFLINE', value: `${client.commands.size} loaded`, color: client.commands.size > 0 ? 0x00ff00 : 0xff0000 },
      { name: 'Events', status: 'ONLINE', value: 'Active', color: 0x00ff00 },
      { name: 'Database', status: 'ONLINE', value: 'SQLite Connected', color: 0x00ff00 },
      { name: 'Music (Lavalink)', status: client.music?.nodes?.size > 0 ? 'ONLINE' : 'OFFLINE', value: client.music?.nodes?.size > 0 ? 'Connected' : 'Disconnected', color: client.music?.nodes?.size > 0 ? 0x00ff00 : 0xff0000 },
      { name: 'WebSocket', status: client.ws?.ready ? 'ONLINE' : 'OFFLINE', value: `Ping: ${client.ws?.ping || 0}ms`, color: client.ws?.ready ? 0x00ff00 : 0xff0000 },
      { name: 'Gateway', status: 'ONLINE', value: `Shard ${(client.ws?.shard?.id || 0) + 1}/${client.ws?.shard?.count || 1}`, color: 0x00ff00 }
    ];

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('nexus_select')
        .setPlaceholder('Select a system...')
        .addOptions(
          systems.map(s => ({
            label: s.name,
            description: `${s.status} - ${s.value}`,
            value: s.name.toLowerCase().replace(/[^a-z]/g, ''),
            emoji: s.color === 0x00ff00 ? '🟢' : '🔴'
          }))
        )
    );

    const mainEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Hacker Bot - Systems Panel')
      .setDescription('**Hacker Bot Systems Overview**\n\n' + systems.map(s =>
        `${s.color === 0x00ff00 ? '🟢' : '🔴'} **${s.name}** \u2014 \`${s.status}\` \u2014 ${s.value}`
      ).join('\n'))
      .addFields(
        { name: 'Uptime', value: `\`${formatUptime(process.uptime())}\``, inline: true },
        { name: 'Memory', value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB\``, inline: true },
        { name: 'Guilds', value: `\`${client.guilds.cache.size}\``, inline: true }
      )
      .setFooter({ text: 'Hacker Bot - Systems Panel' })
      .setTimestamp();

    let response;
    if (isSlash) {
      response = await interaction.reply({ embeds: [mainEmbed], components: [selectRow], fetchReply: true });
    } else {
      response = await interaction.channel.send({ embeds: [mainEmbed], components: [selectRow] });
    }

    const filter = (i) => i.user.id === user.id;
    const collector = response.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async (i) => {
      if (i.customId === 'nexus_select') {
        const sys = i.values[0];
        const system = systems.find(s => s.name.toLowerCase().replace(/[^a-z]/g, '') === sys);
        if (!system) return i.deferUpdate();

        const detailEmbed = new EmbedBuilder()
          .setColor(system.color)
          .setTitle(`Hacker Bot - ${system.name}`)
          .setDescription(`**Status:** \`${system.status}\`\n**Details:** ${system.value}`)
          .setTimestamp();

        await i.update({ embeds: [detailEmbed], components: [selectRow] });
      }
    });

    collector.on('end', () => {
      response.edit({ components: [] }).catch(() => {});
    });
  }
};

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}
