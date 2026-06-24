const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('founder')
    .setDescription('Founder-exclusive menu'),
  cooldown: 0,
  aliases: ['fn'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;

    if (user.id !== config.ownerId) return;

    const client = interaction.client;
    const db = getDB();

    const totalUsers = await db('users').count('user_id as c').first();
    const totalGuilds = await db('guilds').count('guild_id as c').first();
    const totalTickets = await db('tickets').count('id as c').first();

    const founderEmbed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('Founder Menu')
      .setDescription(
        `Welcome back, <@${user.id}>.\n\n` +
        'This is your **exclusive founder dashboard.**\n' +
        'Only you have access to these controls.'
      )
      .addFields(
        { name: 'Bot Stats', value: `Guilds: \`${client.guilds.cache.size}\`\nUsers: \`${totalUsers.c}\`\nTickets: \`${totalTickets.c}\``, inline: true },
        { name: 'Database', value: `Guilds: \`${totalGuilds.c}\`\nUsers: \`${totalUsers.c}\``, inline: true },
        { name: 'System', value: `Uptime: \`${formatUptime(process.uptime())}\`\nMemory: \`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB\``, inline: true },
        { name: 'Exclusive Commands', value: [
          '`!godmode` - Bypass all permissions',
          '`!overwatch` - Live event feed',
          '`!nexus` - Systems panel',
          '`!oracle` - AI analysis',
          '`!vault` - Hidden storage',
          '`!forge` - Create roles/items',
          '`!matrix` - Bot internals',
          '`!chaos` - Fun testing mode',
          '`!shadow` - Invisible logging',
          '`!observer` - Channel monitor',
          '`!commandcenter` - GUI dashboard'
        ].join('\n'), inline: false }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'Founder Menu - Exclusive Access' })
      .setTimestamp();

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('founder_nexus').setLabel('Systems').setEmoji('⚡').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('founder_vault').setLabel('Vault').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('founder_matrix').setLabel('Internals').setEmoji('📊').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('founder_godmode').setLabel('Godmode').setEmoji('👑').setStyle(ButtonStyle.Danger)
    );

    let response;
    if (isSlash) {
      response = await interaction.reply({ embeds: [founderEmbed], components: [buttonRow], fetchReply: true });
    } else {
      response = await interaction.channel.send({ embeds: [founderEmbed], components: [buttonRow] });
    }

    const filter = (i) => i.user.id === user.id;
    const collector = response.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async (i) => {
      try {
        if (i.customId === 'founder_nexus') {
          const nexusCmd = require('./nexus');
          await i.deferUpdate();
          await nexusCmd.execute(interaction, []);
          return;
        }

        if (i.customId === 'founder_vault') {
          const vaultCmd = require('./vault');
          await i.deferUpdate();
          await vaultCmd.execute(interaction, ['list']);
          return;
        }

        if (i.customId === 'founder_matrix') {
          const matrixCmd = require('./matrix');
          await i.deferUpdate();
          await matrixCmd.execute(interaction, []);
          return;
        }

        if (i.customId === 'founder_godmode') {
          const godmodeCmd = require('./godmode');
          await i.deferUpdate();
          await godmodeCmd.execute(interaction, []);
          return;
        }
      } catch (err) {
        console.error('Founder collector error:', err);
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
