const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('commandcenter')
    .setDescription('Modern GUI-style dashboard'),
  cooldown: 0,
  aliases: ['cc', 'dash'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;

    if (user.id !== config.ownerId) return;

    const client = interaction.client;

    const mainEmbed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle('COMMAND CENTER')
      .setDescription(
        '**Welcome to the Command Center dashboard.**\n' +
        'Select a panel from the menu below or use a button for quick actions.'
      )
      .addFields(
        { name: 'Bot Status', value: `\`${client.ws.ready ? 'Online' : 'Offline'}\``, inline: true },
        { name: 'Ping', value: `\`${client.ws.ping}ms\``, inline: true },
        { name: 'Guilds', value: `\`${client.guilds.cache.size}\``, inline: true },
        { name: 'Users', value: `\`${client.users.cache.size}\``, inline: true },
        { name: 'Commands', value: `\`${client.commands.size}\``, inline: true },
        { name: 'Uptime', value: `\`${formatUptime(process.uptime())}\``, inline: true }
      )
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'Command Center v1.0' })
      .setTimestamp();

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('cc_select')
        .setPlaceholder('Select a panel...')
        .addOptions([
          { label: 'System Info', description: 'View system details', value: 'system', emoji: '📊' },
          { label: 'Server List', description: 'List all servers', value: 'servers', emoji: '🏠' },
          { label: 'Quick Actions', description: 'Common owner actions', value: 'actions', emoji: '⚡' },
          { label: 'Security', description: 'Security settings', value: 'security', emoji: '🛡️' }
        ])
    );

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cc_status').setLabel('Status').setEmoji('📊').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cc_broadcast').setLabel('Broadcast').setEmoji('📢').setStyle(ButtonStyle.Secondary)
    );

    let response;
    if (isSlash) {
      response = await interaction.reply({ embeds: [mainEmbed], components: [selectRow, buttonRow], fetchReply: true });
    } else {
      response = await interaction.channel.send({ embeds: [mainEmbed], components: [selectRow, buttonRow] });
    }

    const filter = (i) => i.user.id === user.id;
    const collector = response.createMessageComponentCollector({ filter, time: 120000 });

    collector.on('collect', async (i) => {
      try {
        if (i.customId === 'cc_status') {
          const mem = process.memoryUsage();
          const statusEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('System Status')
            .addFields(
              { name: 'Memory', value: `\`${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB\``, inline: true },
              { name: 'Uptime', value: `\`${formatUptime(process.uptime())}\``, inline: true },
              { name: 'Ping', value: `\`${client.ws.ping}ms\``, inline: true },
              { name: 'Guilds', value: `\`${client.guilds.cache.size}\``, inline: true },
              { name: 'Users', value: `\`${client.users.cache.size}\``, inline: true },
              { name: 'Node', value: `\`${process.version}\``, inline: true }
            )
            .setTimestamp();
          await i.reply({ embeds: [statusEmbed], ephemeral: true });
          return;
        }

        if (i.customId === 'cc_broadcast') {
          await i.reply({ embeds: [
            new EmbedBuilder().setColor(0x5865f2).setTitle('Broadcast').setDescription('Use `!broadcast <message>` to broadcast to all servers.')
          ], ephemeral: true });
          return;
        }

        if (i.customId === 'cc_select') {
          const panel = i.values[0];

          if (panel === 'system') {
            const mem = process.memoryUsage();
            const sysEmbed = new EmbedBuilder()
              .setColor(0x00ff00)
              .setTitle('System Panel')
              .addFields(
                { name: 'PID', value: `\`${process.pid}\``, inline: true },
                { name: 'Platform', value: `\`${process.platform} ${process.arch}\``, inline: true },
                { name: 'Node', value: `\`${process.version}\``, inline: true },
                { name: 'Heap Used', value: `\`${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB\``, inline: true },
                { name: 'Heap Total', value: `\`${(mem.heapTotal / 1024 / 1024).toFixed(1)} MB\``, inline: true },
                { name: 'RSS', value: `\`${(mem.rss / 1024 / 1024).toFixed(1)} MB\``, inline: true }
              )
              .setTimestamp();
            await i.update({ embeds: [sysEmbed], components: [selectRow, buttonRow] });
            return;
          }

          if (panel === 'servers') {
            const guilds = client.guilds.cache.sort((a, b) => b.memberCount - a.memberCount).slice(0, 15);
            const srvEmbed = new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle('Server List')
              .setDescription(guilds.map(g => `\`${g.memberCount}\` - ${g.name}`).join('\n'))
              .setFooter({ text: `Showing ${guilds.size} of ${client.guilds.cache.size} servers` })
              .setTimestamp();
            await i.update({ embeds: [srvEmbed], components: [selectRow, buttonRow] });
            return;
          }

          if (panel === 'actions') {
            const actEmbed = new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle('Quick Actions')
              .setDescription(
                '`!shutdown` - Shutdown bot\n' +
                '`!broadcast <msg>` - Broadcast message\n' +
                '`!backup` - Backup database\n' +
                '`!eval <code>` - Execute code\n' +
                '`!exec <cmd>` - Run shell command\n' +
                '`!reload <cmd>` - Reload a command\n' +
                '`!setstatus <status>` - Set bot status\n' +
                '`!setactivity <type> <text>` - Set activity'
              )
              .setTimestamp();
            await i.update({ embeds: [actEmbed], components: [selectRow, buttonRow] });
            return;
          }

          if (panel === 'security') {
            const secEmbed = new EmbedBuilder()
              .setColor(0xed4245)
              .setTitle('Security Panel')
              .setDescription(
                '`!whitelist <user>` - Whitelist user\n' +
                '`!blacklist <user>` - Blacklist user\n' +
                '`!godmode` - Toggle godmode\n' +
                '`!shadow` - Invisible logging\n' +
                '`!overwatch` - Live event feed\n' +
                '`!observer` - Channel monitoring'
              )
              .setTimestamp();
            await i.update({ embeds: [secEmbed], components: [selectRow, buttonRow] });
            return;
          }
        }
      } catch (err) {
        console.error('CC collector error:', err);
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
