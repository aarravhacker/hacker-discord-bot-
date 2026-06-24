const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicelog')
    .setDescription('Show recent voice activity'),

  name: 'voicelog',
  description: 'Show recent voice activity',
  usage: '!voicelog',

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You lack permissions.')], ephemeral: true });
    }

    const db = getDB();
    const embed = new EmbedBuilder().setColor('#00FF00').setTitle('Recent Voice Activity');

    try {
      const logs = await db('voice_logs')
        .where({ guild_id: interaction.guildId })
        .orderBy('created_at', 'desc')
        .limit(15);

      if (!logs.length) {
        embed.setDescription('No recent voice activity found.');
      } else {
        const entries = logs.map(log => {
          const time = log.created_at ? `<t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>` : 'Unknown';
          const action = log.action || 'activity';
          const channel = log.channel_id ? `<#${log.channel_id}>` : 'Unknown';
          return `• ${action} — <@${log.user_id}> — ${channel} — ${time}`;
        }).join('\n');
        embed.setDescription(entries);
      }
    } catch {
      embed.setDescription('No voice log data available yet.');
    }

    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You lack permissions.')] });
    }

    const db = getDB();
    const embed = new EmbedBuilder().setColor('#00FF00').setTitle('Recent Voice Activity');

    try {
      const logs = await db('voice_logs')
        .where({ guild_id: message.guildId })
        .orderBy('created_at', 'desc')
        .limit(15);

      if (!logs.length) {
        embed.setDescription('No recent voice activity found.');
      } else {
        const entries = logs.map(log => {
          const time = log.created_at ? `<t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>` : 'Unknown';
          const action = log.action || 'activity';
          const channel = log.channel_id ? `<#${log.channel_id}>` : 'Unknown';
          return `• ${action} — <@${log.user_id}> — ${channel} — ${time}`;
        }).join('\n');
        embed.setDescription(entries);
      }
    } catch {
      embed.setDescription('No voice log data available yet.');
    }

    return message.reply({ embeds: [embed] });
  }
};
