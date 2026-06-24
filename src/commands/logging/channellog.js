const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channellog')
    .setDescription('Show recent channel changes'),

  name: 'channellog',
  description: 'Show recent channel changes',
  usage: '!channellog',

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You lack permissions.')], ephemeral: true });
    }

    const db = getDB();
    const embed = new EmbedBuilder().setColor('#00FF00').setTitle('Recent Channel Changes');

    try {
      const logs = await db('audit_logs')
        .where({ guild_id: interaction.guildId })
        .where('action_type', 'like', '%channel%')
        .orderBy('created_at', 'desc')
        .limit(10);

      if (!logs.length) {
        embed.setDescription('No recent channel changes found.');
      } else {
        const entries = logs.map(log => {
          const time = log.created_at ? `<t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>` : 'Unknown';
          return `• ${log.description || log.action_type} — ${time}`;
        }).join('\n');
        embed.setDescription(entries);
      }
    } catch {
      embed.setDescription('No channel log data available yet.');
    }

    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You lack permissions.')] });
    }

    const db = getDB();
    const embed = new EmbedBuilder().setColor('#00FF00').setTitle('Recent Channel Changes');

    try {
      const logs = await db('audit_logs')
        .where({ guild_id: message.guildId })
        .where('action_type', 'like', '%channel%')
        .orderBy('created_at', 'desc')
        .limit(10);

      if (!logs.length) {
        embed.setDescription('No recent channel changes found.');
      } else {
        const entries = logs.map(log => {
          const time = log.created_at ? `<t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>` : 'Unknown';
          return `• ${log.description || log.action_type} — ${time}`;
        }).join('\n');
        embed.setDescription(entries);
      }
    } catch {
      embed.setDescription('No channel log data available yet.');
    }

    return message.reply({ embeds: [embed] });
  }
};
