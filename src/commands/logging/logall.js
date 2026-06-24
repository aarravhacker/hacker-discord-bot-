const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logall')
    .setDescription('Toggle comprehensive logging for all events')
    .addStringOption(opt => opt
      .setName('toggle')
      .setDescription('enable or disable')
      .setRequired(true)
      .addChoices(
        { name: 'enable', value: 'enable' },
        { name: 'disable', value: 'disable' }
      )),

  name: 'logall',
  description: 'Toggle comprehensive logging',
  usage: '!logall <enable|disable>',

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You need Manage Server permission.')], ephemeral: true });
    }

    const toggle = interaction.options.getString('toggle');
    const db = getDB();
    const enabled = toggle === 'enable';

    const allTypes = JSON.stringify([
      'message', 'member', 'role', 'channel', 'voice',
      'server', 'moderation', 'invite', 'emoji', 'sticker'
    ]);

    const existing = await db('logging_config').where({ guild_id: interaction.guildId }).first();

    if (existing) {
      await db('logging_config').where({ guild_id: interaction.guildId }).update({
        enabled: true,
        log_types: enabled ? allTypes : JSON.stringify([])
      });
    } else {
      await db('logging_config').insert({
        guild_id: interaction.guildId,
        channel_id: null,
        enabled: true,
        log_types: enabled ? allTypes : JSON.stringify([])
      });
    }

    const embed = new EmbedBuilder()
      .setColor(enabled ? '#00FF00' : '#FF0000')
      .setDescription(enabled
        ? '✅ Comprehensive logging enabled for all event types.'
        : '❌ Comprehensive logging disabled.');

    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You need Manage Server permission.')] });
    }

    const toggle = args[0];
    if (!toggle || !['enable', 'disable'].includes(toggle)) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription(`Usage: ${this.usage}`)] });
    }

    const db = getDB();
    const enabled = toggle === 'enable';

    const allTypes = JSON.stringify([
      'message', 'member', 'role', 'channel', 'voice',
      'server', 'moderation', 'invite', 'emoji', 'sticker'
    ]);

    const existing = await db('logging_config').where({ guild_id: message.guildId }).first();

    if (existing) {
      await db('logging_config').where({ guild_id: message.guildId }).update({
        enabled: true,
        log_types: enabled ? allTypes : JSON.stringify([])
      });
    } else {
      await db('logging_config').insert({
        guild_id: message.guildId,
        channel_id: null,
        enabled: true,
        log_types: enabled ? allTypes : JSON.stringify([])
      });
    }

    const embed = new EmbedBuilder()
      .setColor(enabled ? '#00FF00' : '#FF0000')
      .setDescription(enabled
        ? '✅ Comprehensive logging enabled for all event types.'
        : '❌ Comprehensive logging disabled.');

    return message.reply({ embeds: [embed] });
  }
};
