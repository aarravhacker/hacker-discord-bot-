const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlog')
    .setDescription('Show moderation logs')
    .addUserOption(opt => opt.setName('user').setDescription('Filter by user')),

  name: 'modlog',
  description: 'Show moderation logs',
  usage: '!modlog [user]',

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You lack permissions.')], ephemeral: true });
    }

    const target = interaction.options.getUser('user');
    const db = getDB();
    const embed = new EmbedBuilder().setColor('#00FF00').setTitle('Moderation Logs');

    try {
      let query = db('mod_logs').where({ guild_id: interaction.guildId });
      if (target) query = query.where({ target_id: target.id });

      const logs = await query.orderBy('created_at', 'desc').limit(15);

      if (!logs.length) {
        embed.setDescription('No moderation logs found.');
      } else {
        const entries = logs.map(log => {
          const time = log.created_at ? `<t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>` : 'Unknown';
          return `• **${log.action}** — <@${log.target_id}> — by <@${log.moderator_id}> — ${time}${log.reason ? `\n  Reason: ${log.reason}` : ''}`;
        }).join('\n');
        embed.setDescription(entries);
      }
    } catch {
      embed.setDescription('No mod log data available yet.');
    }

    if (target) embed.setFooter({ text: `Filtered by ${target.tag}` });

    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You lack permissions.')] });
    }

    const db = getDB();
    const embed = new EmbedBuilder().setColor('#00FF00').setTitle('Moderation Logs');

    let target = null;
    if (args[0]) {
      const id = args[0].replace(/<!?@?|>/g, '');
      target = message.guild.members.cache.get(id)?.user;
    }

    try {
      let query = db('mod_logs').where({ guild_id: message.guildId });
      if (target) query = query.where({ target_id: target.id });

      const logs = await query.orderBy('created_at', 'desc').limit(15);

      if (!logs.length) {
        embed.setDescription('No moderation logs found.');
      } else {
        const entries = logs.map(log => {
          const time = log.created_at ? `<t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>` : 'Unknown';
          return `• **${log.action}** — <@${log.target_id}> — by <@${log.moderator_id}> — ${time}${log.reason ? `\n  Reason: ${log.reason}` : ''}`;
        }).join('\n');
        embed.setDescription(entries);
      }
    } catch {
      embed.setDescription('No mod log data available yet.');
    }

    if (target) embed.setFooter({ text: `Filtered by ${target.tag}` });

    return message.reply({ embeds: [embed] });
  }
};
