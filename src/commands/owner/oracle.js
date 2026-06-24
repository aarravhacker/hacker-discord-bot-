const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('oracle')
    .setDescription('AI-powered server analysis')
    .addStringOption(opt => opt.setName('query').setDescription('What to analyze (overview, members, activity, health)').setRequired(false)),
  cooldown: 10,
  aliases: ['or'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;

    if (user.id !== config.ownerId) return;

    const query = isSlash ? (interaction.options?.getString('query') || 'overview') : (args?.[0] || 'overview');
    const db = getDB();
    const guild = interaction.guild;

    if (query === 'overview') {
      const totalMembers = guild.memberCount;
      const botCount = guild.members.cache.filter(m => m.user.bot).size;
      const humanCount = totalMembers - botCount;
      const onlineCount = guild.members.cache.filter(m => m.presence?.status === 'online').size;
      const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
      const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
      const roles = guild.roles.cache.size;
      const emojis = guild.emojis.cache.size;

      const tickets = await db('tickets').where({ guild_id: guild.id }).count('id as c').first();
      const openTickets = await db('tickets').where({ guild_id: guild.id, status: 'open' }).count('id as c').first();

      const healthScore = Math.min(100, Math.round(
        (onlineCount / humanCount * 30) +
        (textChannels > 5 ? 20 : textChannels * 4) +
        (roles > 5 ? 15 : roles * 3) +
        (openTickets.c < 10 ? 20 : 10) +
        (guild.premiumSubscriptionCount > 0 ? 15 : 0)
      ));

      const embed = new EmbedBuilder()
        .setColor(healthScore > 70 ? 0x00ff00 : healthScore > 40 ? 0xffff00 : 0xff0000)
        .setTitle('Oracle Server Analysis')
        .setDescription(`**${guild.name}** - Health Score: \`${healthScore}/100\``)
        .addFields(
          { name: 'Members', value: `Total: \`${totalMembers}\`\nHumans: \`${humanCount}\`\nBots: \`${botCount}\`\nOnline: \`${onlineCount}\``, inline: true },
          { name: 'Channels', value: `Text: \`${textChannels}\`\nVoice: \`${voiceChannels}\``, inline: true },
          { name: 'Server', value: `Roles: \`${roles}\`\nEmojis: \`${emojis}\`\nBoost: \`${guild.premiumSubscriptionCount || 0}\``, inline: true },
          { name: 'Tickets', value: `Open: \`${openTickets.c}\`\nTotal: \`${tickets.c}\``, inline: true },
          { name: 'Health Bar', value: getHealthBar(healthScore), inline: false }
        )
        .setFooter({ text: 'Oracle AI Analysis' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (query === 'members') {
      const members = guild.members.cache;
      const roles = guild.roles.cache.sort((a, b) => b.members.size - a.members.size).slice(0, 10);

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Oracle - Member Analysis')
        .setDescription(`**Top Roles by Member Count:**\n${roles.map(r => `\`${r.members.size}\` - ${r}`).join('\n')}`)
        .addFields(
          { name: 'Total Members', value: `\`${guild.memberCount}\``, inline: true },
          { name: 'Bots', value: `\`${members.filter(m => m.user.bot).size}\``, inline: true },
          { name: 'Humans', value: `\`${members.filter(m => !m.user.bot).size}\``, inline: true }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (query === 'health') {
      const memUsage = process.memoryUsage();
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Oracle - Bot Health')
        .addFields(
          { name: 'Memory', value: `Heap: \`${(memUsage.heapUsed / 1024 / 1024).toFixed(1)} MB\`\nRSS: \`${(memUsage.rss / 1024 / 1024).toFixed(1)} MB\``, inline: true },
          { name: 'Process', value: `Uptime: \`${formatUptime(process.uptime())}\`\nPID: \`${process.pid}\``, inline: true },
          { name: 'Platform', value: `${process.platform} ${process.arch}\nNode ${process.version}`, inline: true }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    return interaction.reply({ embeds: [
      new EmbedBuilder().setColor(0xff0000).setTitle('Invalid Query').setDescription('Use: `overview`, `members`, or `health`')
    ] });
  }
};

function getHealthBar(score) {
  const filled = Math.round(score / 5);
  const empty = 20 - filled;
  return '`' + '█'.repeat(filled) + '░'.repeat(empty) + '` ' + score + '%';
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}
