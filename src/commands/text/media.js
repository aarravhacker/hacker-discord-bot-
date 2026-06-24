const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('media')
    .setDescription('Media channel management system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommandGroup(group =>
      group.setName('channel')
        .setDescription('Manage media-only channels')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Add a channel as media-only')
            .addChannelOption(opt =>
              opt.setName('channel').setDescription('Channel to add').setRequired(true).addChannelTypes(ChannelType.GuildText)
            )
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a channel from media-only')
            .addChannelOption(opt =>
              opt.setName('channel').setDescription('Channel to remove').setRequired(true).addChannelTypes(ChannelType.GuildText)
            )
        )
        .addSubcommand(sub =>
          sub.setName('show')
            .setDescription('Show all media channels')
        )
        .addSubcommand(sub =>
          sub.setName('reset')
            .setDescription('Remove all media channels')
        )
    )
    .addSubcommandGroup(group =>
      group.setName('bypass')
        .setDescription('Manage users who bypass media filter')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Add a user to bypass list')
            .addUserOption(opt =>
              opt.setName('user').setDescription('User to add').setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a user from bypass list')
            .addUserOption(opt =>
              opt.setName('user').setDescription('User to remove').setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub.setName('show')
            .setDescription('Show all bypass users')
        )
        .addSubcommand(sub =>
          sub.setName('reset')
            .setDescription('Remove all bypass users')
        )
    ),
  cooldown: 3,
  aliases: ['mediachannel', 'mediachannels'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guildId = interaction.guild.id;
    interaction.args = args;

    if (isSlash) {
      const group = interaction.options.getSubcommandGroup();
      const sub = interaction.options.getSubcommand();
      return handleCommand(interaction, guildId, group, sub, isSlash);
    }

    const group = args?.[0];
    const sub = args?.[1];
    const validGroups = ['channel', 'bypass'];
    const validSubs = ['add', 'remove', 'show', 'reset'];

    if (!group || !validGroups.includes(group)) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Usage', 'Usage: `media <channel|bypass> <add|remove|show|reset>`')]
      });
    }
    if (!sub || !validSubs.includes(sub)) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Subcommand', 'Usage: `media ' + group + ' <add|remove|show|reset>`')]
      });
    }

    return handleCommand(interaction, guildId, group, sub, isSlash);
  }
};

async function handleCommand(interaction, guildId, group, sub, isSlash) {
  if (group === 'channel') {
    switch (sub) {
      case 'add': return handleChannelAdd(interaction, guildId, isSlash);
      case 'remove': return handleChannelRemove(interaction, guildId, isSlash);
      case 'show': return handleChannelShow(interaction, guildId);
      case 'reset': return handleChannelReset(interaction, guildId);
    }
  } else if (group === 'bypass') {
    switch (sub) {
      case 'add': return handleBypassAdd(interaction, guildId, isSlash);
      case 'remove': return handleBypassRemove(interaction, guildId, isSlash);
      case 'show': return handleBypassShow(interaction, guildId);
      case 'reset': return handleBypassReset(interaction, guildId);
    }
  }
}

async function handleChannelAdd(interaction, guildId, isSlash) {
  try {
    const channel = isSlash
      ? interaction.options.getChannel('channel')
      : interaction.guild.channels.cache.get(args?.[2]?.replace(/[<#>]/g, ''));

    if (!channel) {
      return interaction.reply({ embeds: [errorEmbed('Please specify a valid channel.')] });
    }

    const db = getDB();
    await db.schema.hasTable('media_channels').then(exists => {
      if (!exists) {
        return db.schema.createTable('media_channels', table => {
          table.string('guild_id');
          table.string('channel_id');
          table.primary(['guild_id', 'channel_id']);
        });
      }
    });

    const existing = await db('media_channels').where({ guild_id: guildId, channel_id: channel.id }).first();
    if (existing) {
      return interaction.reply({ embeds: [warningEmbed(`${channel} is already a media channel.`)] });
    }

    await db('media_channels').insert({ guild_id: guildId, channel_id: channel.id });

    const embed = new EmbedBuilder()
      .setTitle('Media Channel Added')
      .setDescription(`${channel} is now a media-only channel. Users without bypass must send attachments.`)
      .setColor(embedColors.success)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [errorEmbed('Failed to add media channel.')] });
  }
}

async function handleChannelRemove(interaction, guildId, isSlash) {
  try {
    const channel = isSlash
      ? interaction.options.getChannel('channel')
      : interaction.guild.channels.cache.get(args?.[2]?.replace(/[<#>]/g, ''));

    if (!channel) {
      return interaction.reply({ embeds: [errorEmbed('Please specify a valid channel.')] });
    }

    const db = getDB();
    const deleted = await db('media_channels').where({ guild_id: guildId, channel_id: channel.id }).del();

    if (!deleted) {
      return interaction.reply({ embeds: [errorEmbed(`${channel} is not a media channel.`)] });
    }

    const embed = new EmbedBuilder()
      .setTitle('Media Channel Removed')
      .setDescription(`${channel} is no longer a media-only channel.`)
      .setColor(embedColors.success)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [errorEmbed('Failed to remove media channel.')] });
  }
}

async function handleChannelShow(interaction, guildId) {
  try {
    const db = getDB();
    await db.schema.hasTable('media_channels').then(exists => {
      if (!exists) {
        return db.schema.createTable('media_channels', table => {
          table.string('guild_id');
          table.string('channel_id');
          table.primary(['guild_id', 'channel_id']);
        });
      }
    });

    const channels = await db('media_channels').where({ guild_id: guildId });

    if (channels.length === 0) {
      return interaction.reply({ embeds: [infoEmbed('No media channels configured.')] });
    }

    const list = channels.map((c, i) => `\`${i + 1}\`. <#${c.channel_id}>`).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('Media Channels')
      .setDescription(list)
      .setColor(embedColors.info)
      .setFooter({ text: `Total: ${channels.length} channel(s)` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [errorEmbed('Failed to list media channels.')] });
  }
}

async function handleChannelReset(interaction, guildId) {
  try {
    const db = getDB();
    await db.schema.hasTable('media_channels').then(exists => {
      if (!exists) {
        return db.schema.createTable('media_channels', table => {
          table.string('guild_id');
          table.string('channel_id');
          table.primary(['guild_id', 'channel_id']);
        });
      }
    });

    const count = await db('media_channels').where({ guild_id: guildId }).del();

    const embed = new EmbedBuilder()
      .setTitle('Media Channels Reset')
      .setDescription(`Removed ${count} media channel(s). All channels are now unrestricted.`)
      .setColor(embedColors.success)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [errorEmbed('Failed to reset media channels.')] });
  }
}

async function handleBypassAdd(interaction, guildId, isSlash) {
  try {
    const user = isSlash
      ? interaction.options.getUser('user')
      : interaction.guild.members.cache.get(args?.[2]?.replace(/[<@!>]/g, ''))?.user;

    if (!user) {
      return interaction.reply({ embeds: [errorEmbed('Please specify a valid user.')] });
    }

    const db = getDB();
    await db.schema.hasTable('media_bypass').then(exists => {
      if (!exists) {
        return db.schema.createTable('media_bypass', table => {
          table.string('guild_id');
          table.string('user_id');
          table.primary(['guild_id', 'user_id']);
        });
      }
    });

    const existing = await db('media_bypass').where({ guild_id: guildId, user_id: user.id }).first();
    if (existing) {
      return interaction.reply({ embeds: [warningEmbed(`<@${user.id}> is already in the bypass list.`)] });
    }

    await db('media_bypass').insert({ guild_id: guildId, user_id: user.id });

    const embed = new EmbedBuilder()
      .setTitle('Bypass User Added')
      .setDescription(`<@${user.id}> can now send non-media messages in media channels.`)
      .setColor(embedColors.success)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [errorEmbed('Failed to add bypass user.')] });
  }
}

async function handleBypassRemove(interaction, guildId, isSlash) {
  try {
    const user = isSlash
      ? interaction.options.getUser('user')
      : interaction.guild.members.cache.get(args?.[2]?.replace(/[<@!>]/g, ''))?.user;

    if (!user) {
      return interaction.reply({ embeds: [errorEmbed('Please specify a valid user.')] });
    }

    const db = getDB();
    const deleted = await db('media_bypass').where({ guild_id: guildId, user_id: user.id }).del();

    if (!deleted) {
      return interaction.reply({ embeds: [errorEmbed(`<@${user.id}> is not in the bypass list.`)] });
    }

    const embed = new EmbedBuilder()
      .setTitle('Bypass User Removed')
      .setDescription(`<@${user.id}> can no longer bypass the media filter.`)
      .setColor(embedColors.success)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [errorEmbed('Failed to remove bypass user.')] });
  }
}

async function handleBypassShow(interaction, guildId) {
  try {
    const db = getDB();
    await db.schema.hasTable('media_bypass').then(exists => {
      if (!exists) {
        return db.schema.createTable('media_bypass', table => {
          table.string('guild_id');
          table.string('user_id');
          table.primary(['guild_id', 'user_id']);
        });
      }
    });

    const users = await db('media_bypass').where({ guild_id: guildId });

    if (users.length === 0) {
      return interaction.reply({ embeds: [infoEmbed('No bypass users configured.')] });
    }

    const list = users.map((u, i) => `\`${i + 1}\`. <@${u.user_id}>`).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('Media Bypass Users')
      .setDescription(list)
      .setColor(embedColors.info)
      .setFooter({ text: `Total: ${users.length} user(s)` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [errorEmbed('Failed to list bypass users.')] });
  }
}

async function handleBypassReset(interaction, guildId) {
  try {
    const db = getDB();
    await db.schema.hasTable('media_bypass').then(exists => {
      if (!exists) {
        return db.schema.createTable('media_bypass', table => {
          table.string('guild_id');
          table.string('user_id');
          table.primary(['guild_id', 'user_id']);
        });
      }
    });

    const count = await db('media_bypass').where({ guild_id: guildId }).del();

    const embed = new EmbedBuilder()
      .setTitle('Bypass Users Reset')
      .setDescription(`Removed ${count} bypass user(s). All users must now follow media rules.`)
      .setColor(embedColors.success)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [errorEmbed('Failed to reset bypass users.')] });
  }
}
