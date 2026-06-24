const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} = require('discord.js');
const { getDB } = require('../../db/connection');

const COLORS = {
  success: 0x00ff00,
  error: 0xff0000,
  warning: 0xffa500,
  info: 0x2f3136,
};

function parsePlaceholders(text, user, server, count) {
  if (!text) return '';
  return text
    .replace(/\{user\}/g, user.toString())
    .replace(/\{server\}/g, server.name)
    .replace(/\{count\}/g, count.toString());
}

async function ensureTable(db) {
  const exists = await db.schema.hasTable('greet_config');
  if (!exists) {
    await db.schema.createTable('greet_config', (t) => {
      t.string('guild_id').primary();
      t.json('channels').defaultTo('[]');
      t.text('message').defaultTo('Welcome {user} to {server}!');
      t.string('title');
      t.string('footer');
      t.string('image');
      t.string('thumbnail');
      t.boolean('embed').defaultTo(true);
      t.boolean('ping').defaultTo(false);
      t.integer('autodel').defaultTo(0);
      t.boolean('enabled').defaultTo(true);
    });
  }
}

async function getConfig(db, guildId) {
  await ensureTable(db);
  let row = await db('greet_config').where('guild_id', guildId).first();
  if (!row) {
    await db('greet_config').insert({
      guild_id: guildId,
      channels: '[]',
      message: 'Welcome {user} to {server}!',
      embed: true,
      ping: false,
      autodel: 0,
      enabled: true,
    });
    row = await db('greet_config').where('guild_id', guildId).first();
  }
  if (typeof row.channels === 'string') {
    row.channels = JSON.parse(row.channels);
  }
  return row;
}

async function updateConfig(db, guildId, data) {
  await ensureTable(db);
  const existing = await db('greet_config').where('guild_id', guildId).first();
  if (existing) {
    await db('greet_config').where('guild_id', guildId).update(data);
  } else {
    await db('greet_config').insert({ guild_id: guildId, ...data });
  }
}

async function sendGreeting(member, config) {
  const channel = member.guild.channels.cache.get(
    config.channels && config.channels.length > 0 ? config.channels[0] : null
  );
  if (!channel) return;

  const memberCount = member.guild.memberCount;
  const msg = parsePlaceholders(
    config.message || 'Welcome {user} to {server}!',
    member.user,
    member.guild,
    memberCount
  );

  let pingPart = '';
  if (config.ping) {
    pingPart = `<@${member.id}> `;
  }

  if (config.embed) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setDescription(msg);

    if (config.title) embed.setTitle(config.title);
    if (config.footer) embed.setFooter({ text: config.footer });
    if (config.image) embed.setImage(config.image);
    if (config.thumbnail) embed.setThumbnail(config.thumbnail);

    const sent = await channel.send({ content: pingPart || null, embeds: [embed] });
    if (config.autodel && config.autodel > 0) {
      setTimeout(() => sent.delete().catch(() => {}), config.autodel * 1000);
    }
    return sent;
  } else {
    const text = `${pingPart}${msg}`;
    const sent = await channel.send({ content: text });
    if (config.autodel && config.autodel > 0) {
      setTimeout(() => sent.delete().catch(() => {}), config.autodel * 1000);
    }
    return sent;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('greet')
    .setDescription('Complete greeting system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('autodel')
        .setDescription('Auto-delete greeting after X seconds')
        .addIntegerOption((opt) =>
          opt
            .setName('seconds')
            .setDescription('Seconds to wait before deleting (0 to disable)')
            .setRequired(true)
            .setMinValue(0)
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('channel')
        .setDescription('Manage greet channels')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Add a greet channel')
            .addChannelOption((opt) =>
              opt
                .setName('channel')
                .setDescription('Channel to add')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Remove a greet channel')
            .addChannelOption((opt) =>
              opt
                .setName('channel')
                .setDescription('Channel to remove')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('show')
            .setDescription('Show all greet channels')
        )
    )
    .addSubcommand((sub) =>
      sub.setName('config').setDescription('View greet configuration')
    )
    .addSubcommand((sub) =>
      sub
        .setName('embed')
        .setDescription('Toggle embed mode')
        .addBooleanOption((opt) =>
          opt
            .setName('toggle')
            .setDescription('Enable or disable embed mode')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('footer')
        .setDescription('Set footer text')
        .addStringOption((opt) =>
          opt
            .setName('text')
            .setDescription('Footer text')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('image')
        .setDescription('Set greeting image URL')
        .addStringOption((opt) =>
          opt
            .setName('url')
            .setDescription('Image URL')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('message')
        .setDescription('Set greeting message (supports {user}, {server}, {count})')
        .addStringOption((opt) =>
          opt
            .setName('text')
            .setDescription('Message text')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('ping')
        .setDescription('Toggle ping in greeting')
        .addBooleanOption((opt) =>
          opt
            .setName('toggle')
            .setDescription('Enable or disable ping')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Reset all greet settings')
        .addStringOption((opt) =>
          opt
            .setName('confirm')
            .setDescription('Type "yes" to confirm')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Quick setup greeting')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Greet channel')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption((opt) =>
          opt
            .setName('message')
            .setDescription('Greeting message')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('test')
        .setDescription('Test greeting')
        .addUserOption((opt) =>
          opt
            .setName('user')
            .setDescription('User to test with (defaults to you)')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('thumbnail')
        .setDescription('Set thumbnail URL')
        .addStringOption((opt) =>
          opt
            .setName('url')
            .setDescription('Thumbnail URL')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('title')
        .setDescription('Set embed title')
        .addStringOption((opt) =>
          opt
            .setName('text')
            .setDescription('Title text')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('view')
        .setDescription('View current greet settings')
    ),

  async execute(interaction) {
    const db = getDB();
    await ensureTable(db);
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup(false);

    if (group === 'channel') {
      if (sub === 'add') {
        const channel = interaction.options.getChannel('channel');
        const config = await getConfig(db, guildId);
        const channels = config.channels || [];
        if (channels.includes(channel.id)) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.warning)
                .setDescription(`⚠️ ${channel} is already a greet channel.`),
            ],
          });
        }
        channels.push(channel.id);
        await updateConfig(db, guildId, { channels: JSON.stringify(channels) });
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.success)
              .setDescription(`✅ ${channel} has been added as a greet channel.`)
              .setTimestamp(),
          ],
        });
      }

      if (sub === 'remove') {
        const channel = interaction.options.getChannel('channel');
        const config = await getConfig(db, guildId);
        const channels = config.channels || [];
        if (!channels.includes(channel.id)) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.warning)
                .setDescription(`⚠️ ${channel} is not a greet channel.`),
            ],
          });
        }
        const updated = channels.filter((id) => id !== channel.id);
        await updateConfig(db, guildId, { channels: JSON.stringify(updated) });
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.success)
              .setDescription(`✅ ${channel} has been removed from greet channels.`)
              .setTimestamp(),
          ],
        });
      }

      if (sub === 'show') {
        const config = await getConfig(db, guildId);
        const channels = config.channels || [];
        if (channels.length === 0) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.info)
                .setDescription('No greet channels configured. Use `/greet channel add` to add one.'),
            ],
          });
        }
        const list = channels
          .map((id) => `<#${id}>`)
          .join('\n');
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.info)
              .setTitle('Greet Channels')
              .setDescription(list)
              .setFooter({ text: `Total: ${channels.length}` })
              .setTimestamp(),
          ],
        });
      }
    }

    switch (sub) {
      case 'autodel': {
        const seconds = interaction.options.getInteger('seconds');
        await updateConfig(db, guildId, { autodel: seconds });
        const embed = new EmbedBuilder()
          .setColor(COLORS.success)
          .setTimestamp();
        if (seconds === 0) {
          embed.setDescription('✅ Auto-delete has been disabled.');
        } else {
          embed.setDescription(
            `✅ Greetings will now auto-delete after **${seconds}** second${seconds !== 1 ? 's' : ''}.`
          );
        }
        return interaction.reply({ embeds: [embed] });
      }

      case 'config': {
        const config = await getConfig(db, guildId);
        const channelList =
          config.channels && config.channels.length > 0
            ? config.channels.map((id) => `<#${id}>`).join(', ')
            : 'None';
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.info)
              .setTitle('Greet Configuration')
              .addFields(
                { name: 'Channels', value: channelList, inline: true },
                {
                  name: 'Message',
                  value: config.message || 'Welcome {user} to {server}!',
                  inline: false,
                },
                { name: 'Title', value: config.title || 'Not set', inline: true },
                { name: 'Footer', value: config.footer || 'Not set', inline: true },
                { name: 'Embed', value: config.embed ? 'Enabled' : 'Disabled', inline: true },
                { name: 'Ping', value: config.ping ? 'Enabled' : 'Disabled', inline: true },
                {
                  name: 'Auto-delete',
                  value: config.autodel > 0 ? `${config.autodel}s` : 'Disabled',
                  inline: true,
                },
                {
                  name: 'Image',
                  value: config.image || 'Not set',
                  inline: false,
                },
                {
                  name: 'Thumbnail',
                  value: config.thumbnail || 'Not set',
                  inline: false,
                }
              )
              .setTimestamp(),
          ],
        });
      }

      case 'embed': {
        const toggle = interaction.options.getBoolean('toggle');
        await updateConfig(db, guildId, { embed: toggle });
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.success)
              .setDescription(
                `✅ Embed mode has been **${toggle ? 'enabled' : 'disabled'}**.`
              )
              .setTimestamp(),
          ],
        });
      }

      case 'footer': {
        const text = interaction.options.getString('text');
        await updateConfig(db, guildId, { footer: text });
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.success)
              .setDescription(`✅ Footer text has been updated to: **${text}**`)
              .setTimestamp(),
          ],
        });
      }

      case 'image': {
        const url = interaction.options.getString('url');
        if (!/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(url)) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.error)
                .setDescription('❌ Invalid image URL. Must be a direct link to an image.'),
            ],
          });
        }
        await updateConfig(db, guildId, { image: url });
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.success)
              .setDescription('✅ Greeting image has been updated.')
              .setImage(url)
              .setTimestamp(),
          ],
        });
      }

      case 'message': {
        const text = interaction.options.getString('text');
        await updateConfig(db, guildId, { message: text });
        const preview = parsePlaceholders(
          text,
          interaction.user,
          interaction.guild,
          interaction.guild.memberCount
        );
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.success)
              .setDescription('✅ Greeting message has been updated.')
              .addFields(
                { name: 'Template', value: text, inline: false },
                { name: 'Preview', value: preview, inline: false }
              )
              .setTimestamp(),
          ],
        });
      }

      case 'ping': {
        const toggle = interaction.options.getBoolean('toggle');
        await updateConfig(db, guildId, { ping: toggle });
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.success)
              .setDescription(
                `✅ Ping in greeting has been **${toggle ? 'enabled' : 'disabled'}**.`
              )
              .setTimestamp(),
          ],
        });
      }

      case 'reset': {
        const confirm = interaction.options.getString('confirm');
        if (confirm.toLowerCase() !== 'yes') {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.error)
                .setDescription(
                  '❌ You must type `yes` to confirm the reset. This action is irreversible.'
                ),
            ],
          });
        }
        await db('greet_config').where('guild_id', guildId).del();
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.success)
              .setDescription(
                '✅ All greet settings have been reset to defaults.'
              )
              .setTimestamp(),
          ],
        });
      }

      case 'setup': {
        const channel = interaction.options.getChannel('channel');
        const message =
          interaction.options.getString('message') ||
          'Welcome {user} to {server}!';
        await updateConfig(db, guildId, {
          channels: JSON.stringify([channel.id]),
          message,
          enabled: true,
        });
        const preview = parsePlaceholders(
          message,
          interaction.user,
          interaction.guild,
          interaction.guild.memberCount
        );
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.success)
              .setTitle('Greet Setup Complete')
              .setDescription('The greeting system has been configured.')
              .addFields(
                { name: 'Channel', value: `${channel}`, inline: true },
                { name: 'Message', value: preview, inline: false }
              )
              .setTimestamp(),
          ],
        });
      }

      case 'test': {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member =
          interaction.guild.members.cache.get(targetUser.id) ||
          (await interaction.guild.members.fetch(targetUser.id).catch(() => null));
        if (!member) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.error)
                .setDescription('❌ Could not find that member in this server.'),
            ],
          });
        }
        const config = await getConfig(db, guildId);
        if (!config.channels || config.channels.length === 0) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.warning)
                .setDescription(
                  '⚠️ No greet channels configured. Use `/greet channel add` first.'
                ),
            ],
          });
        }
        const greetChannel = interaction.guild.channels.cache.get(config.channels[0]);
        if (!greetChannel) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.error)
                .setDescription('❌ The configured greet channel no longer exists.'),
            ],
          });
        }
        const msg = parsePlaceholders(
          config.message || 'Welcome {user} to {server}!',
          targetUser,
          interaction.guild,
          interaction.guild.memberCount
        );
        let pingPart = '';
        if (config.ping) {
          pingPart = `<@${targetUser.id}> `;
        }
        if (config.embed) {
          const embed = new EmbedBuilder()
            .setColor(COLORS.success)
            .setDescription(msg);
          if (config.title) embed.setTitle(config.title);
          if (config.footer) embed.setFooter({ text: config.footer });
          if (config.image) embed.setImage(config.image);
          if (config.thumbnail) embed.setThumbnail(config.thumbnail);
          await greetChannel.send({ content: pingPart || null, embeds: [embed] });
        } else {
          await greetChannel.send({ content: `${pingPart}${msg}` });
        }
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.success)
              .setDescription(`✅ Test greeting sent to ${greetChannel}.`)
              .setTimestamp(),
          ],
        });
      }

      case 'thumbnail': {
        const url = interaction.options.getString('url');
        if (!/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(url)) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.error)
                .setDescription('❌ Invalid thumbnail URL. Must be a direct link to an image.'),
            ],
          });
        }
        await updateConfig(db, guildId, { thumbnail: url });
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.success)
              .setDescription('✅ Thumbnail URL has been updated.')
              .setThumbnail(url)
              .setTimestamp(),
          ],
        });
      }

      case 'title': {
        const text = interaction.options.getString('text');
        await updateConfig(db, guildId, { title: text });
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.success)
              .setDescription(`✅ Embed title has been set to: **${text}**`)
              .setTimestamp(),
          ],
        });
      }

      case 'view': {
        const config = await getConfig(db, guildId);
        const channelList =
          config.channels && config.channels.length > 0
            ? config.channels.map((id) => `<#${id}>`).join('\n')
            : 'None';
        const preview = parsePlaceholders(
          config.message || 'Welcome {user} to {server}!',
          interaction.user,
          interaction.guild,
          interaction.guild.memberCount
        );
        const embed = new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('Greet Settings')
          .addFields(
            { name: 'Status', value: config.enabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
            { name: 'Embed', value: config.embed ? 'On' : 'Off', inline: true },
            { name: 'Ping', value: config.ping ? 'On' : 'Off', inline: true },
            {
              name: 'Auto-delete',
              value: config.autodel > 0 ? `${config.autodel}s` : 'Off',
              inline: true,
            },
            { name: 'Channels', value: channelList, inline: false },
            { name: 'Title', value: config.title || 'Not set', inline: true },
            { name: 'Footer', value: config.footer || 'Not set', inline: true },
            { name: 'Message', value: config.message || 'Not set', inline: false },
            { name: 'Preview', value: preview, inline: false },
            { name: 'Image', value: config.image || 'Not set', inline: false },
            { name: 'Thumbnail', value: config.thumbnail || 'Not set', inline: false }
          )
          .setTimestamp();
        if (config.image) embed.setImage(config.image);
        return interaction.reply({ embeds: [embed] });
      }
    }
  },

  async executePrefix(message, args) {
    const db = getDB();
    await ensureTable(db);
    const guildId = message.guild.id;

    const sub = args[0];
    const subArgs = args.slice(1);

    if (!sub) {
      const config = await getConfig(db, guildId);
      const channelList =
        config.channels && config.channels.length > 0
          ? config.channels.map((id) => `<#${id}>`).join('\n')
          : 'None';
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.info)
            .setTitle('Greet Commands')
            .setDescription('Use `!greet <subcommand>` with these options:')
            .addFields(
              { name: 'autodel <seconds>', value: 'Set auto-delete timer', inline: true },
              { name: 'channel add/remove/show', value: 'Manage channels', inline: true },
              { name: 'config', value: 'View config', inline: true },
              { name: 'embed <on/off>', value: 'Toggle embed', inline: true },
              { name: 'footer <text>', value: 'Set footer', inline: true },
              { name: 'image <url>', value: 'Set image', inline: true },
              { name: 'message <text>', value: 'Set message', inline: true },
              { name: 'ping <on/off>', value: 'Toggle ping', inline: true },
              { name: 'reset yes', value: 'Reset settings', inline: true },
              { name: 'setup <#channel> [msg]', value: 'Quick setup', inline: true },
              { name: 'test [@user]', value: 'Test greeting', inline: true },
              { name: 'thumbnail <url>', value: 'Set thumbnail', inline: true },
              { name: 'title <text>', value: 'Set title', inline: true },
              { name: 'view', value: 'View settings', inline: true }
            )
            .setTimestamp(),
        ],
      });
    }

    if (sub === 'channel') {
      const channelSub = subArgs[0];
      const mentionedChannel =
        subArgs[1] &&
        message.mentions.channels.first();

      if (channelSub === 'add') {
        if (!mentionedChannel) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.error)
                .setDescription('❌ Please mention a channel: `!greet channel add #channel`'),
            ],
          });
        }
        const config = await getConfig(db, guildId);
        const channels = config.channels || [];
        if (channels.includes(mentionedChannel.id)) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.warning)
                .setDescription(`⚠️ ${mentionedChannel} is already a greet channel.`),
            ],
          });
        }
        channels.push(mentionedChannel.id);
        await updateConfig(db, guildId, { channels: JSON.stringify(channels) });
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.success)
              .setDescription(`✅ ${mentionedChannel} has been added as a greet channel.`)
              .setTimestamp(),
          ],
        });
      }

      if (channelSub === 'remove') {
        if (!mentionedChannel) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.error)
                .setDescription('❌ Please mention a channel: `!greet channel remove #channel`'),
            ],
          });
        }
        const config = await getConfig(db, guildId);
        const channels = config.channels || [];
        if (!channels.includes(mentionedChannel.id)) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.warning)
                .setDescription(`⚠️ ${mentionedChannel} is not a greet channel.`),
            ],
          });
        }
        const updated = channels.filter((id) => id !== mentionedChannel.id);
        await updateConfig(db, guildId, { channels: JSON.stringify(updated) });
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.success)
              .setDescription(`✅ ${mentionedChannel} has been removed from greet channels.`)
              .setTimestamp(),
          ],
        });
      }

      if (channelSub === 'show') {
        const config = await getConfig(db, guildId);
        const channels = config.channels || [];
        if (channels.length === 0) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.info)
                .setDescription('No greet channels configured. Use `!greet channel add #channel` to add one.'),
            ],
          });
        }
        const list = channels.map((id) => `<#${id}>`).join('\n');
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.info)
              .setTitle('Greet Channels')
              .setDescription(list)
              .setFooter({ text: `Total: ${channels.length}` })
              .setTimestamp(),
          ],
        });
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.error)
            .setDescription('❌ Invalid channel subcommand. Use `add`, `remove`, or `show`.'),
        ],
      });
    }

    if (sub === 'autodel') {
      const val = parseInt(subArgs[0], 10);
      if (isNaN(val) || val < 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.error)
              .setDescription('❌ Please provide a valid number of seconds (0 or higher).'),
          ],
        });
      }
      await updateConfig(db, guildId, { autodel: val });
      const embed = new EmbedBuilder().setColor(COLORS.success).setTimestamp();
      if (val === 0) {
        embed.setDescription('✅ Auto-delete has been disabled.');
      } else {
        embed.setDescription(
          `✅ Greetings will now auto-delete after **${val}** second${val !== 1 ? 's' : ''}.`
        );
      }
      return message.reply({ embeds: [embed] });
    }

    if (sub === 'config') {
      const config = await getConfig(db, guildId);
      const channelList =
        config.channels && config.channels.length > 0
          ? config.channels.map((id) => `<#${id}>`).join(', ')
          : 'None';
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.info)
            .setTitle('Greet Configuration')
            .addFields(
              { name: 'Channels', value: channelList, inline: true },
              { name: 'Message', value: config.message || 'Welcome {user} to {server}!', inline: false },
              { name: 'Title', value: config.title || 'Not set', inline: true },
              { name: 'Footer', value: config.footer || 'Not set', inline: true },
              { name: 'Embed', value: config.embed ? 'Enabled' : 'Disabled', inline: true },
              { name: 'Ping', value: config.ping ? 'Enabled' : 'Disabled', inline: true },
              { name: 'Auto-delete', value: config.autodel > 0 ? `${config.autodel}s` : 'Disabled', inline: true },
              { name: 'Image', value: config.image || 'Not set', inline: false },
              { name: 'Thumbnail', value: config.thumbnail || 'Not set', inline: false }
            )
            .setTimestamp(),
        ],
      });
    }

    if (sub === 'embed') {
      const toggleStr = subArgs[0];
      if (!toggleStr || !['on', 'off', 'true', 'false'].includes(toggleStr.toLowerCase())) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.error)
              .setDescription('❌ Usage: `!greet embed on/off`'),
          ],
        });
      }
      const toggle = ['on', 'true'].includes(toggleStr.toLowerCase());
      await updateConfig(db, guildId, { embed: toggle });
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setDescription(`✅ Embed mode has been **${toggle ? 'enabled' : 'disabled'}**.`)
            .setTimestamp(),
        ],
      });
    }

    if (sub === 'footer') {
      const text = subArgs.join(' ');
      if (!text) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.error)
              .setDescription('❌ Usage: `!greet footer <text>`'),
          ],
        });
      }
      await updateConfig(db, guildId, { footer: text });
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setDescription(`✅ Footer text has been updated to: **${text}**`)
            .setTimestamp(),
        ],
      });
    }

    if (sub === 'image') {
      const url = subArgs[0];
      if (!url || !/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(url)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.error)
              .setDescription('❌ Usage: `!greet image <url>` — Must be a direct image link.'),
          ],
        });
      }
      await updateConfig(db, guildId, { image: url });
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setDescription('✅ Greeting image has been updated.')
            .setImage(url)
            .setTimestamp(),
        ],
      });
    }

    if (sub === 'message') {
      const text = subArgs.join(' ');
      if (!text) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.error)
              .setDescription('❌ Usage: `!greet message <text>` — Supports {user}, {server}, {count}'),
          ],
        });
      }
      await updateConfig(db, guildId, { message: text });
      const preview = parsePlaceholders(text, message.author, message.guild, message.guild.memberCount);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setDescription('✅ Greeting message has been updated.')
            .addFields(
              { name: 'Template', value: text, inline: false },
              { name: 'Preview', value: preview, inline: false }
            )
            .setTimestamp(),
        ],
      });
    }

    if (sub === 'ping') {
      const toggleStr = subArgs[0];
      if (!toggleStr || !['on', 'off', 'true', 'false'].includes(toggleStr.toLowerCase())) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.error)
              .setDescription('❌ Usage: `!greet ping on/off`'),
          ],
        });
      }
      const toggle = ['on', 'true'].includes(toggleStr.toLowerCase());
      await updateConfig(db, guildId, { ping: toggle });
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setDescription(`✅ Ping in greeting has been **${toggle ? 'enabled' : 'disabled'}**.`)
            .setTimestamp(),
        ],
      });
    }

    if (sub === 'reset') {
      if (subArgs[0] && subArgs[0].toLowerCase() !== 'yes') {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.error)
              .setDescription('❌ You must type `!greet reset yes` to confirm. This action is irreversible.'),
          ],
        });
      }
      await db('greet_config').where('guild_id', guildId).del();
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setDescription('✅ All greet settings have been reset to defaults.')
            .setTimestamp(),
        ],
      });
    }

    if (sub === 'setup') {
      const mentionedChannel = message.mentions.channels.first();
      if (!mentionedChannel) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.error)
              .setDescription('❌ Usage: `!greet setup #channel [message]`'),
          ],
        });
      }
      const msgText = subArgs.slice(1).join(' ') || 'Welcome {user} to {server}!';
      await updateConfig(db, guildId, {
        channels: JSON.stringify([mentionedChannel.id]),
        message: msgText,
        enabled: true,
      });
      const preview = parsePlaceholders(msgText, message.author, message.guild, message.guild.memberCount);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('Greet Setup Complete')
            .setDescription('The greeting system has been configured.')
            .addFields(
              { name: 'Channel', value: `${mentionedChannel}`, inline: true },
              { name: 'Message', value: preview, inline: false }
            )
            .setTimestamp(),
        ],
      });
    }

    if (sub === 'test') {
      const config = await getConfig(db, guildId);
      if (!config.channels || config.channels.length === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.warning)
              .setDescription('⚠️ No greet channels configured. Use `!greet channel add #channel` first.'),
          ],
        });
      }
      const targetUser =
        message.mentions.users.first() || message.author;
      const member =
        message.guild.members.cache.get(targetUser.id) ||
        (await message.guild.members.fetch(targetUser.id).catch(() => null));
      if (!member) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.error)
              .setDescription('❌ Could not find that member in this server.'),
          ],
        });
      }
      const greetChannel = message.guild.channels.cache.get(config.channels[0]);
      if (!greetChannel) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.error)
              .setDescription('❌ The configured greet channel no longer exists.'),
          ],
        });
      }
      const msg = parsePlaceholders(
        config.message || 'Welcome {user} to {server}!',
        targetUser,
        message.guild,
        message.guild.memberCount
      );
      let pingPart = '';
      if (config.ping) {
        pingPart = `<@${targetUser.id}> `;
      }
      if (config.embed) {
        const embed = new EmbedBuilder().setColor(COLORS.success).setDescription(msg);
        if (config.title) embed.setTitle(config.title);
        if (config.footer) embed.setFooter({ text: config.footer });
        if (config.image) embed.setImage(config.image);
        if (config.thumbnail) embed.setThumbnail(config.thumbnail);
        await greetChannel.send({ content: pingPart || null, embeds: [embed] });
      } else {
        await greetChannel.send({ content: `${pingPart}${msg}` });
      }
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setDescription(`✅ Test greeting sent to ${greetChannel}.`)
            .setTimestamp(),
        ],
      });
    }

    if (sub === 'thumbnail') {
      const url = subArgs[0];
      if (!url || !/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(url)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.error)
              .setDescription('❌ Usage: `!greet thumbnail <url>` — Must be a direct image link.'),
          ],
        });
      }
      await updateConfig(db, guildId, { thumbnail: url });
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setDescription('✅ Thumbnail URL has been updated.')
            .setThumbnail(url)
            .setTimestamp(),
        ],
      });
    }

    if (sub === 'title') {
      const text = subArgs.join(' ');
      if (!text) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.error)
              .setDescription('❌ Usage: `!greet title <text>`'),
          ],
        });
      }
      await updateConfig(db, guildId, { title: text });
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setDescription(`✅ Embed title has been set to: **${text}**`)
            .setTimestamp(),
        ],
      });
    }

    if (sub === 'view') {
      const config = await getConfig(db, guildId);
      const channelList =
        config.channels && config.channels.length > 0
          ? config.channels.map((id) => `<#${id}>`).join('\n')
          : 'None';
      const preview = parsePlaceholders(
        config.message || 'Welcome {user} to {server}!',
        message.author,
        message.guild,
        message.guild.memberCount
      );
      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('Greet Settings')
        .addFields(
          { name: 'Status', value: config.enabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
          { name: 'Embed', value: config.embed ? 'On' : 'Off', inline: true },
          { name: 'Ping', value: config.ping ? 'On' : 'Off', inline: true },
          { name: 'Auto-delete', value: config.autodel > 0 ? `${config.autodel}s` : 'Off', inline: true },
          { name: 'Channels', value: channelList, inline: false },
          { name: 'Title', value: config.title || 'Not set', inline: true },
          { name: 'Footer', value: config.footer || 'Not set', inline: true },
          { name: 'Message', value: config.message || 'Not set', inline: false },
          { name: 'Preview', value: preview, inline: false },
          { name: 'Image', value: config.image || 'Not set', inline: false },
          { name: 'Thumbnail', value: config.thumbnail || 'Not set', inline: false }
        )
        .setTimestamp();
      if (config.image) embed.setImage(config.image);
      return message.reply({ embeds: [embed] });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.error)
          .setDescription(
            '❌ Unknown subcommand. Use `!greet` to see available commands.'
          ),
      ],
    });
  },

  async handleGuildMemberAdd(member) {
    const db = getDB();
    await ensureTable(db);
    const config = await getConfig(db, member.guild.id);
    if (!config.enabled) return;
    if (!config.channels || config.channels.length === 0) return;

    for (const channelId of config.channels) {
      const channel = member.guild.channels.cache.get(channelId);
      if (!channel) continue;

      const msg = parsePlaceholders(
        config.message || 'Welcome {user} to {server}!',
        member.user,
        member.guild,
        member.guild.memberCount
      );

      let pingPart = '';
      if (config.ping) {
        pingPart = `<@${member.id}> `;
      }

      try {
        if (config.embed) {
          const embed = new EmbedBuilder()
            .setColor(COLORS.success)
            .setDescription(msg);
          if (config.title) embed.setTitle(config.title);
          if (config.footer) embed.setFooter({ text: config.footer });
          if (config.image) embed.setImage(config.image);
          if (config.thumbnail) embed.setThumbnail(config.thumbnail);
          const sent = await channel.send({ content: pingPart || null, embeds: [embed] });
          if (config.autodel && config.autodel > 0) {
            setTimeout(() => sent.delete().catch(() => {}), config.autodel * 1000);
          }
        } else {
          const sent = await channel.send({ content: `${pingPart}${msg}` });
          if (config.autodel && config.autodel > 0) {
            setTimeout(() => sent.delete().catch(() => {}), config.autodel * 1000);
          }
        }
      } catch (err) {
        console.error(`[Greet] Failed to send greeting in ${channelId}:`, err);
      }
    }
  },
};
