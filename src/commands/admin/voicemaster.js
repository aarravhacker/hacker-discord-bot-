const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicemaster')
    .setDescription('Complete temp voice management system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Set up the voicemaster system')
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Voice channel to use as creator').setRequired(true)
            .addChannelTypes(ChannelType.GuildVoice)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all active temp voice channels'))
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset the voicemaster system')),

  async execute(interaction) {
    const db = getDB();
    const guildId = interaction.guildId;
    const sub = interaction.options.getSubcommand();

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTimestamp();

    if (sub === 'list') {
      const tempChannels = await db('temp_channels').where({ guild_id: guildId });
      if (tempChannels.length === 0) {
        embed.setDescription('No active temp voice channels.').setColor(0xFEE75C);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const description = tempChannels.map(tc => {
        const channel = interaction.guild.channels.cache.get(tc.channel_id);
        if (!channel) return null;
        return `**${channel.name}** - <@${tc.owner_id}> (${channel.members.size} members)`;
      }).filter(Boolean).join('\n');

      embed
        .setTitle('Active Temp Voice Channels')
        .setDescription(description)
        .setFooter({ text: `${tempChannels.length} active channels` });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'reset') {
      const config = await db('voicemaster_config').where({ guild_id: guildId }).first();
      if (!config) {
        embed.setDescription('Voicemaster is not set up.').setColor(0xFEE75C);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Delete all temp channels
      const tempChannels = await db('temp_channels').where({ guild_id: guildId });
      for (const tc of tempChannels) {
        const channel = interaction.guild.channels.cache.get(tc.channel_id);
        if (channel) {
          try { await channel.delete('Voicemaster reset'); } catch (e) {}
        }
      }

      await db('temp_channels').where({ guild_id: guildId }).del();
      await db('voicemaster_config').where({ guild_id: guildId }).del();
      await db('vc_bans').where({ guild_id: guildId }).del();
      await db('vc_logs').where({ guild_id: guildId }).del();

      embed
        .setTitle('Voicemaster Reset')
        .setDescription('All temp voice channels and configs have been **deleted**.')
        .setColor(0xED4245);

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');

      const existing = await db('voicemaster_config').where({ guild_id: guildId }).first();
      if (existing) {
        // Update existing config
        await db('voicemaster_config').where({ guild_id: guildId }).update({
          channel_id: channel.id,
          enabled: true,
          updated_at: new Date()
        });
      } else {
        // Create new config
        await db('voicemaster_config').insert({
          guild_id: guildId,
          channel_id: channel.id,
          enabled: true,
          created_at: new Date()
        });
      }

      // Ensure DB tables exist
      const hasVCBans = await db.schema.hasTable('vc_bans');
      if (!hasVCBans) {
        await db.schema.createTable('vc_bans', table => {
          table.string('guild_id');
          table.string('user_id');
          table.string('banned_by');
          table.timestamp('created_at');
          table.primary(['guild_id', 'user_id']);
        });
      }

      const hasTempChannels = await db.schema.hasTable('temp_channels');
      if (!hasTempChannels) {
        await db.schema.createTable('temp_channels', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.string('channel_id');
          table.string('owner_id');
          table.text('trusted_users').defaultTo('[]');
          table.timestamp('created_at');
          table.timestamp('transferred_at').nullable();
        });
      }

      const hasVCLogs = await db.schema.hasTable('vc_logs');
      if (!hasVCLogs) {
        await db.schema.createTable('vc_logs', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.string('channel_id');
          table.string('user_id');
          table.string('action');
          table.timestamp('created_at');
        });
      }

      embed
        .setTitle('Voicemaster Setup')
        .setDescription(`Voicemaster system configured for <#${channel.id}>.`)
        .addFields(
          { name: 'How it works', value: 'When a user joins the voice channel, a new temp channel is created for them automatically.' },
          { name: 'Commands', value: [
            '`/vclock` - Lock channel',
            '`/vcunlock` - Unlock channel',
            '`/vchide` - Hide channel',
            '`/vcunhide` - Unhide channel',
            '`/vclimit` - Set user limit',
            '`/vcbitrate` - Set bitrate',
            '`/vckick` - Kick user',
            '`/vctransfer` - Transfer ownership',
            '`/vctrust` - Trust user',
            '`/vcuntrust` - Untrust user',
            '`/vcban` - Ban from temp voice',
            '`/vcunban` - Unban from temp voice',
            '`/vcclaim` - Claim channel',
            '`/vcstatus` - Channel info',
            '`/vcclean` - Clean empty channels',
            '`/vclogs` - View logs',
            '`/vcinvoke` - Show settings',
            '`/vcchat` - Toggle text chat',
            '`/vcsuppress` - Suppress user',
            '`/vcunsuppress` - Unsuppress user',
            '`/vcregion` - Set region'
          ].join('\n') }
        )
        .setColor(0x57F287);

      return interaction.reply({ embeds: [embed] });
    }
  },
  adminOnly: true
};
