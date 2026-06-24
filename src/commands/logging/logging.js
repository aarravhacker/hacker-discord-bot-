const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logging')
    .setDescription('Configure the logging system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub
      .setName('config')
      .setDescription('View current logging configuration'))
    .addSubcommand(sub => sub
      .setName('setup')
      .setDescription('Set the logging channel')
      .addChannelOption(opt => opt.setName('channel').setDescription('Channel for logs').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(sub => sub
      .setName('enable')
      .setDescription('Enable logging'))
    .addSubcommand(sub => sub
      .setName('disable')
      .setDescription('Disable logging')),

  name: 'logging',
  description: 'Configure the logging system',
  usage: '!logging <config|setup|enable|disable> [channel]',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const db = getDB();
    const embed = new EmbedBuilder();

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You need Manage Server permission.')], ephemeral: true });
    }

    switch (sub) {
      case 'config': {
        const config = await db('logging_config').where({ guild_id: interaction.guildId }).first();

        if (!config) {
          embed.setColor('#FFFF00').setDescription('No logging configuration found. Use `setup` to configure.');
        } else {
          const channel = interaction.guild.channels.cache.get(config.channel_id);
          embed.setColor('#00FF00')
            .setTitle('Logging Configuration')
            .addFields(
              { name: 'Channel', value: channel ? channel.toString() : 'Not found', inline: true },
              { name: 'Enabled', value: config.enabled ? '✅ Yes' : '❌ No', inline: true },
              { name: 'Log Types', value: config.log_types ? JSON.stringify(JSON.parse(config.log_types)) : 'All', inline: false }
            );
        }
        break;
      }

      case 'setup': {
        const channel = interaction.options.getChannel('channel');

        const existing = await db('logging_config').where({ guild_id: interaction.guildId }).first();

        if (existing) {
          await db('logging_config').where({ guild_id: interaction.guildId }).update({ channel_id: channel.id, enabled: true });
        } else {
          await db('logging_config').insert({
            guild_id: interaction.guildId,
            channel_id: channel.id,
            enabled: true,
            log_types: JSON.stringify(['all'])
          });
        }

        embed.setColor('#00FF00').setDescription(`✅ Logging channel set to ${channel} and enabled.`);
        break;
      }

      case 'enable': {
        const config = await db('logging_config').where({ guild_id: interaction.guildId }).first();
        if (!config) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('No logging config found. Use `setup` first.')], ephemeral: true });

        await db('logging_config').where({ guild_id: interaction.guildId }).update({ enabled: true });
        embed.setColor('#00FF00').setDescription('✅ Logging enabled.');
        break;
      }

      case 'disable': {
        const config = await db('logging_config').where({ guild_id: interaction.guildId }).first();
        if (!config) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('No logging config found.')], ephemeral: true });

        await db('logging_config').where({ guild_id: interaction.guildId }).update({ enabled: false });
        embed.setColor('#FF0000').setDescription('❌ Logging disabled.');
        break;
      }
    }

    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const sub = args[0];
    const db = getDB();
    const embed = new EmbedBuilder();

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You need Manage Server permission.')] });
    }

    switch (sub) {
      case 'config': {
        const config = await db('logging_config').where({ guild_id: message.guildId }).first();

        if (!config) {
          embed.setColor('#FFFF00').setDescription('No logging configuration found. Use `setup` to configure.');
        } else {
          const channel = message.guild.channels.cache.get(config.channel_id);
          embed.setColor('#00FF00')
            .setTitle('Logging Configuration')
            .addFields(
              { name: 'Channel', value: channel ? channel.toString() : 'Not found', inline: true },
              { name: 'Enabled', value: config.enabled ? '✅ Yes' : '❌ No', inline: true },
              { name: 'Log Types', value: config.log_types ? JSON.stringify(JSON.parse(config.log_types)) : 'All', inline: false }
            );
        }
        break;
      }

      case 'setup': {
        const channelId = args[1]?.replace(/<#|>/g, '');
        const channel = message.guild.channels.cache.get(channelId);

        if (!channel || channel.type !== ChannelType.GuildText) {
          return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Provide a valid text channel.')], ephemeral: true });
        }

        const existing = await db('logging_config').where({ guild_id: message.guildId }).first();

        if (existing) {
          await db('logging_config').where({ guild_id: message.guildId }).update({ channel_id: channel.id, enabled: true });
        } else {
          await db('logging_config').insert({
            guild_id: message.guildId,
            channel_id: channel.id,
            enabled: true,
            log_types: JSON.stringify(['all'])
          });
        }

        embed.setColor('#00FF00').setDescription(`✅ Logging channel set to ${channel} and enabled.`);
        break;
      }

      case 'enable': {
        const config = await db('logging_config').where({ guild_id: message.guildId }).first();
        if (!config) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('No config found. Use `setup` first.')] });

        await db('logging_config').where({ guild_id: message.guildId }).update({ enabled: true });
        embed.setColor('#00FF00').setDescription('✅ Logging enabled.');
        break;
      }

      case 'disable': {
        const config = await db('logging_config').where({ guild_id: message.guildId }).first();
        if (!config) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('No config found.')] });

        await db('logging_config').where({ guild_id: message.guildId }).update({ enabled: false });
        embed.setColor('#FF0000').setDescription('❌ Logging disabled.');
        break;
      }

      default:
        return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription(`Invalid subcommand. Usage: ${this.usage}`)] });
    }

    return message.reply({ embeds: [embed] });
  }
};
