const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('messages')
    .setDescription('Track messages in the server')
    .addSubcommand(sub =>
      sub.setName('channel').setDescription('Manage tracked channels')
        .addStringOption(opt =>
          opt.setName('action').setDescription('add, remove, or show').setRequired(true)
            .addChoices(
              { name: 'add', value: 'add' },
              { name: 'remove', value: 'remove' },
              { name: 'show', value: 'show' }
            )
        )
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Target channel').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('user').setDescription('Manage tracked users')
        .addStringOption(opt =>
          opt.setName('action').setDescription('add, remove, or show').setRequired(true)
            .addChoices(
              { name: 'add', value: 'add' },
              { name: 'remove', value: 'remove' },
              { name: 'show', value: 'show' }
            )
        )
        .addUserOption(opt =>
          opt.setName('user').setDescription('Target user').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('leaderboard').setDescription('Show message leaderboard')
    )
    .addSubcommand(sub =>
      sub.setName('reset').setDescription('Reset all message tracking')
    ),
  cooldown: 5,
  aliases: ['msgs', 'msg'],
  prefix: true,

  async execute(interaction, args) {
    const db = getDB();
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();

    try {
      if (sub === 'channel') {
        const action = interaction.options.getString('action');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        if (action === 'add') {
          const existing = await db('message_tracking')
            .where({ guild_id: guildId, channel_id: channel.id })
            .first();

          if (existing) {
            return interaction.reply({
              embeds: [infoEmbed(`Channel ${channel} is already tracked.`)],
              ephemeral: true,
            });
          }

          await db('message_tracking').insert({
            guild_id: guildId,
            user_id: '0',
            channel_id: channel.id,
            message_count: 0,
            last_updated: new Date(),
          });

          return interaction.reply({
            embeds: [successEmbed(`Now tracking messages in ${channel}.`)],
          });
        }

        if (action === 'remove') {
          const deleted = await db('message_tracking')
            .where({ guild_id: guildId, channel_id: channel.id })
            .del();

          if (deleted === 0) {
            return interaction.reply({
              embeds: [errorEmbed(`Channel ${channel} is not tracked.`)],
              ephemeral: true,
            });
          }

          return interaction.reply({
            embeds: [successEmbed(`Stopped tracking messages in ${channel}.`)],
          });
        }

        if (action === 'show') {
          const channels = await db('message_tracking')
            .where({ guild_id: guildId })
            .whereNot({ user_id: '0' })
            .select('channel_id')
            .distinct();

          const list = channels.map(c => `<#${c.channel_id}>`).join('\n') || 'No tracked channels';
          return interaction.reply({
            embeds: [infoEmbed(`Tracked Channels:\n${list}`)],
          });
        }
      }

      if (sub === 'user') {
        const action = interaction.options.getString('action');
        const user = interaction.options.getUser('user') || interaction.user;

        if (action === 'add') {
          const existing = await db('message_tracking')
            .where({ guild_id: guildId, user_id: user.id })
            .first();

          if (existing) {
            return interaction.reply({
              embeds: [infoEmbed(`${user.tag} is already tracked.`)],
              ephemeral: true,
            });
          }

          await db('message_tracking').insert({
            guild_id: guildId,
            user_id: user.id,
            channel_id: '0',
            message_count: 0,
            last_updated: new Date(),
          });

          return interaction.reply({
            embeds: [successEmbed(`Now tracking messages for ${user.tag}.`)],
          });
        }

        if (action === 'remove') {
          const deleted = await db('message_tracking')
            .where({ guild_id: guildId, user_id: user.id })
            .del();

          if (deleted === 0) {
            return interaction.reply({
              embeds: [errorEmbed(`${user.tag} is not tracked.`)],
              ephemeral: true,
            });
          }

          return interaction.reply({
            embeds: [successEmbed(`Stopped tracking messages for ${user.tag}.`)],
          });
        }

        if (action === 'show') {
          const users = await db('message_tracking')
            .where({ guild_id: guildId })
            .whereNot({ channel_id: '0' })
            .select('user_id', 'message_count')
            .orderBy('message_count', 'desc');

          const list = users.map(u => `<@${u.user_id}> — ${u.message_count} messages`).join('\n') || 'No tracked users';
          return interaction.reply({
            embeds: [infoEmbed(`Tracked Users:\n${list}`)],
          });
        }
      }

      if (sub === 'leaderboard') {
        const users = await db('message_tracking')
          .where({ guild_id: guildId })
          .whereNot({ channel_id: '0' })
          .select('user_id')
          .sum('message_count as total')
          .groupBy('user_id')
          .orderBy('total', 'desc')
          .limit(15);

        if (users.length === 0) {
          return interaction.reply({
            embeds: [infoEmbed('No message data yet.')],
          });
        }

        const list = users.map((u, i) =>
          `${i + 1}. <@${u.user_id}> — **${u.total}** messages`
        ).join('\n');

        const embed = new EmbedBuilder()
          .setColor('#ffd700')
          .setTitle('Message Leaderboard')
          .setDescription(list)
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'reset') {
        await db('message_tracking').where({ guild_id: guildId }).del();
        return interaction.reply({
          embeds: [successEmbed('All message tracking data has been reset.')],
        });
      }
    } catch (err) {
      console.error(err);
      return interaction.reply({
        embeds: [errorEmbed('Failed to process message tracking command.')],
        ephemeral: true,
      });
    }
  },
};
