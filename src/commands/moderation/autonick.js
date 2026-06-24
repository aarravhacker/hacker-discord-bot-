const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autonick')
    .setDescription('Auto-nickname system for new members')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Set up auto-nickname with a pattern')
        .addStringOption(opt =>
          opt.setName('pattern').setDescription('Nickname pattern (e.g. {username}#{discrim})').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('config')
        .setDescription('Show current auto-nick config'))
    .addSubcommand(sub =>
      sub.setName('enable')
        .setDescription('Enable auto-nickname'))
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disable auto-nickname'))
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset auto-nickname config'))
    .addSubcommand(sub =>
      sub.setName('examples')
        .setDescription('Show available pattern variables')),

  async execute(interaction) {
    const db = getDB();
    const guildId = interaction.guildId;
    const sub = interaction.options.getSubcommand();

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
      .setTimestamp();

    if (sub === 'examples') {
      embed
        .setTitle('Auto-Nick Pattern Examples')
        .setDescription([
          '`{username}` - User\'s current username',
          '`{discrim}` - User\'s discriminator (0001)',
          '`{id}` - User\'s ID',
          '`{tag}` - Full username#discriminator',
          '`{date}` - Current date (YYYY-MM-DD)',
          '`{guild}` - Server name',
          '`{rand:5}` - Random string of N chars',
          '`{inc}` - Incrementing number per guild'
        ].join('\n'))
        .setColor(0x5865F2);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'config') {
      const row = await db('autonick_config').where({ guild_id: guildId }).first();
      if (!row) {
        embed.setTitle('Auto-Nick Config').setDescription('No config found. Use `/autonick setup` to configure.').setColor(0xFEE75C);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      embed
        .setTitle('Auto-Nick Config')
        .addFields(
          { name: 'Enabled', value: row.enabled ? '`Yes`' : '`No`', inline: true },
          { name: 'Pattern', value: `\`${row.pattern || 'None'}\``, inline: true },
          { name: 'Created', value: `<t:${Math.floor(new Date(row.created_at).getTime() / 1000)}:R>`, inline: true }
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'enable') {
      const existing = await db('autonick_config').where({ guild_id: guildId }).first();
      if (!existing) {
        embed.setDescription('Run `/autonick setup` first to create a config.').setColor(0xFEE75C);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      await db('autonick_config').where({ guild_id: guildId }).update({ enabled: true });
      embed.setTitle('Auto-Nick Enabled').setDescription('Auto-nickname is now **enabled**.').setColor(0x57F287);
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'disable') {
      await db('autonick_config').where({ guild_id: guildId }).update({ enabled: false });
      embed.setTitle('Auto-Nick Disabled').setDescription('Auto-nickname is now **disabled**.').setColor(0xED4245);
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'reset') {
      await db('autonick_config').where({ guild_id: guildId }).del();
      embed.setTitle('Auto-Nick Reset').setDescription('Auto-nickname config has been **deleted**.').setColor(0xED4245);
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'setup') {
      const pattern = interaction.options.getString('pattern');
      const existing = await db('autonick_config').where({ guild_id: guildId }).first();
      if (existing) {
        await db('autonick_config').where({ guild_id: guildId }).update({ pattern, enabled: true, updated_at: new Date() });
      } else {
        await db('autonick_config').insert({ guild_id: guildId, pattern, enabled: true, created_at: new Date() });
      }
      embed
        .setTitle('Auto-Nick Setup')
        .setDescription(`Pattern set to: \`${pattern}\``)
        .addFields({ name: 'Preview', value: this.previewPattern(pattern, interaction.member) })
        .setColor(0x57F287);
      return interaction.reply({ embeds: [embed] });
    }
  },

  previewPattern(pattern, member) {
    let preview = pattern;
    preview = preview.replace(/\{username\}/g, member.user.username);
    preview = preview.replace(/\{discrim\}/g, member.user.discriminator || '0001');
    preview = preview.replace(/\{id\}/g, member.id);
    preview = preview.replace(/\{tag\}/g, member.user.tag);
    preview = preview.replace(/\{guild\}/g, member.guild.name);
    preview = preview.replace(/\{rand:(\d+)\}/g, (_, n) => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      return Array.from({ length: parseInt(n) }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    });
    return `\`${preview}\``;
  },
  adminOnly: true
};
