const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('msglog')
    .setDescription('Show recent message edits and deletes'),

  name: 'msglog',
  description: 'Show recent message edits and deletes',
  usage: '!msglog',

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You lack permissions.')], ephemeral: true });
    }

    const db = getDB();
    const embed = new EmbedBuilder().setColor('#00FF00').setTitle('Recent Message Logs');

    try {
      const logs = await db('message_logs')
        .where({ guild_id: interaction.guildId })
        .orderBy('created_at', 'desc')
        .limit(15);

      if (!logs.length) {
        embed.setDescription('No recent message logs found.');
      } else {
        const entries = logs.map(log => {
          const time = log.created_at ? `<t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>` : 'Unknown';
          const action = log.action === 'edit' ? '✏️ Edited' : '🗑️ Deleted';
          const content = log.content ? (log.content.length > 80 ? log.content.substring(0, 80) + '...' : log.content) : 'N/A';
          return `• ${action} in <#${log.channel_id}> — <@${log.user_id}> — ${time}\n  \`${content}\``;
        }).join('\n');
        embed.setDescription(entries);
      }
    } catch {
      embed.setDescription('No message log data available yet.');
    }

    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You lack permissions.')] });
    }

    const db = getDB();
    const embed = new EmbedBuilder().setColor('#00FF00').setTitle('Recent Message Logs');

    try {
      const logs = await db('message_logs')
        .where({ guild_id: message.guildId })
        .orderBy('created_at', 'desc')
        .limit(15);

      if (!logs.length) {
        embed.setDescription('No recent message logs found.');
      } else {
        const entries = logs.map(log => {
          const time = log.created_at ? `<t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>` : 'Unknown';
          const action = log.action === 'edit' ? '✏️ Edited' : '🗑️ Deleted';
          const content = log.content ? (log.content.length > 80 ? log.content.substring(0, 80) + '...' : log.content) : 'N/A';
          return `• ${action} in <#${log.channel_id}> — <@${log.user_id}> — ${time}\n  \`${content}\``;
        }).join('\n');
        embed.setDescription(entries);
      }
    } catch {
      embed.setDescription('No message log data available yet.');
    }

    return message.reply({ embeds: [embed] });
  }
};
