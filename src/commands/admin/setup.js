const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Server configuration system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('config')
        .setDescription('View current server configuration')
    )
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Set a channel for a feature')
        .addStringOption(opt =>
          opt.setName('type').setDescription('Feature type').setRequired(true)
            .addChoices(
              { name: 'welcome', value: 'welcome' },
              { name: 'goodbye', value: 'goodbye' },
              { name: 'log', value: 'log' },
              { name: 'starboard', value: 'starboard' }
            )
        )
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('The channel to set').setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Remove a channel assignment')
        .addStringOption(opt =>
          opt.setName('component').setDescription('Feature to remove').setRequired(true)
            .addChoices(
              { name: 'welcome', value: 'welcome' },
              { name: 'goodbye', value: 'goodbye' },
              { name: 'log', value: 'log' },
              { name: 'starboard', value: 'starboard' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('friend')
        .setDescription('Set the friend role')
        .addRoleOption(opt =>
          opt.setName('role').setDescription('The role to assign as friend').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('girl')
        .setDescription('Set the girl role')
        .addRoleOption(opt =>
          opt.setName('role').setDescription('The role to assign as girl').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('guest')
        .setDescription('Set the guest role')
        .addRoleOption(opt =>
          opt.setName('role').setDescription('The role to assign as guest').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('staff')
        .setDescription('Set the staff role')
        .addRoleOption(opt =>
          opt.setName('role').setDescription('The role to assign as staff').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('vip')
        .setDescription('Set the VIP role')
        .addRoleOption(opt =>
          opt.setName('role').setDescription('The role to assign as VIP').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('reqrole')
        .setDescription('Set the required role for server access')
        .addRoleOption(opt =>
          opt.setName('role').setDescription('The required role').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all configured settings')
    )
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset all server configuration')
        .addStringOption(opt =>
          opt.setName('confirm').setDescription('Type "yes" to confirm reset').setRequired(true)
        )
    ),
  cooldown: 5,
  aliases: ['cfg', 'config', 'serverconfig'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription('You need the **Administrator** permission to use this command.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const db = getDB();
    const guildId = guild.id;

    let sub;
    let subArgs = {};

    if (isSlash) {
      sub = interaction.options.getSubcommand();
      if (sub === 'create' || sub === 'delete') {
        subArgs.type = interaction.options.getString('type');
        subArgs.channel = interaction.options.getChannel('channel');
      }
      if (['friend', 'girl', 'guest', 'staff', 'vip', 'reqrole'].includes(sub)) {
        subArgs.role = interaction.options.getRole('role');
      }
      if (sub === 'reset') {
        subArgs.confirm = interaction.options.getString('confirm');
      }
    } else {
      const cmdArgs = interaction.content.split(' ').slice(1);
      sub = cmdArgs[0]?.toLowerCase();
      if (sub === 'create' || sub === 'delete') {
        subArgs.type = cmdArgs[1]?.toLowerCase();
        const channelId = cmdArgs[2]?.replace(/[<>#]/g, '');
        subArgs.channel = guild.channels.cache.get(channelId);
      }
      if (['friend', 'girl', 'guest', 'staff', 'vip', 'reqrole'].includes(sub)) {
        const roleId = cmdArgs[1]?.replace(/[<>@&]/g, '');
        subArgs.role = guild.roles.cache.get(roleId);
      }
      if (sub === 'reset') {
        subArgs.confirm = cmdArgs[1];
      }
    }

    if (!sub) {
      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription(
          '**Setup Subcommands:**\n' +
          '`config` - View current configuration\n' +
          '`create <type> <channel>` - Set a channel\n' +
          '`delete <type>` - Remove a channel\n' +
          '`friend/girl/guest/staff/vip/reqrole <role>` - Set roles\n' +
          '`list` - List all settings\n' +
          '`reset yes` - Reset all configuration'
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      let settings = await db('guild_settings').where({ guild_id: guildId }).first();
      if (!settings) {
        await db('guild_settings').insert({ guild_id: guildId, config: '{}' });
        settings = await db('guild_settings').where({ guild_id: guildId }).first();
      }

      const currentConfig = settings.config ? JSON.parse(settings.config) : {};

      switch (sub) {
        case 'config': {
          const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle(`${guild.name} Configuration`)
            .addFields(
              { name: 'Welcome Channel', value: currentConfig.welcome_channel ? `<#${currentConfig.welcome_channel}>` : 'Not set', inline: true },
              { name: 'Goodbye Channel', value: currentConfig.goodbye_channel ? `<#${currentConfig.goodbye_channel}>` : 'Not set', inline: true },
              { name: 'Log Channel', value: currentConfig.log_channel ? `<#${currentConfig.log_channel}>` : 'Not set', inline: true },
              { name: 'Starboard Channel', value: currentConfig.starboard_channel ? `<#${currentConfig.starboard_channel}>` : 'Not set', inline: true },
              { name: 'Friend Role', value: currentConfig.friend_role ? `<@&${currentConfig.friend_role}>` : 'Not set', inline: true },
              { name: 'Girl Role', value: currentConfig.girl_role ? `<@&${currentConfig.girl_role}>` : 'Not set', inline: true },
              { name: 'Guest Role', value: currentConfig.guest_role ? `<@&${currentConfig.guest_role}>` : 'Not set', inline: true },
              { name: 'Staff Role', value: currentConfig.staff_role ? `<@&${currentConfig.staff_role}>` : 'Not set', inline: true },
              { name: 'VIP Role', value: currentConfig.vip_role ? `<@&${currentConfig.vip_role}>` : 'Not set', inline: true },
              { name: 'Required Role', value: currentConfig.req_role ? `<@&${currentConfig.req_role}>` : 'Not set', inline: true }
            )
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        case 'create': {
          if (!subArgs.type) {
            const embed = new EmbedBuilder()
              .setColor(0xffa500)
              .setDescription('Usage: `!setup create <welcome|goodbye|log|starboard> <channel>`');
            return interaction.reply({ embeds: [embed], ephemeral: true });
          }
          if (!subArgs.channel) {
            const embed = new EmbedBuilder()
              .setColor(0xff0000)
              .setDescription('Please provide a valid channel.');
            return interaction.reply({ embeds: [embed], ephemeral: true });
          }

          const channelMap = {
            welcome: 'welcome_channel',
            goodbye: 'goodbye_channel',
            log: 'log_channel',
            starboard: 'starboard_channel'
          };

          currentConfig[channelMap[subArgs.type]] = subArgs.channel.id;
          await db('guild_settings').where({ guild_id: guildId }).update({ config: JSON.stringify(currentConfig) });

          const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setDescription(`**${subArgs.type.charAt(0).toUpperCase() + subArgs.type.slice(1)} channel** set to ${subArgs.channel}`);
          return interaction.reply({ embeds: [embed] });
        }

        case 'delete': {
          if (!subArgs.type) {
            const embed = new EmbedBuilder()
              .setColor(0xffa500)
              .setDescription('Usage: `!setup delete <welcome|goodbye|log|starboard>`');
            return interaction.reply({ embeds: [embed], ephemeral: true });
          }

          const deleteMap = {
            welcome: 'welcome_channel',
            goodbye: 'goodbye_channel',
            log: 'log_channel',
            starboard: 'starboard_channel'
          };

          delete currentConfig[deleteMap[subArgs.type]];
          await db('guild_settings').where({ guild_id: guildId }).update({ config: JSON.stringify(currentConfig) });

          const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setDescription(`**${subArgs.type.charAt(0).toUpperCase() + subArgs.type.slice(1)} channel** has been removed.`);
          return interaction.reply({ embeds: [embed] });
        }

        case 'friend':
        case 'girl':
        case 'guest':
        case 'staff':
        case 'vip':
        case 'reqrole': {
          if (!subArgs.role) {
            const embed = new EmbedBuilder()
              .setColor(0xff0000)
              .setDescription('Please provide a valid role.');
            return interaction.reply({ embeds: [embed], ephemeral: true });
          }

          const roleMap = {
            friend: 'friend_role',
            girl: 'girl_role',
            guest: 'guest_role',
            staff: 'staff_role',
            vip: 'vip_role',
            reqrole: 'req_role'
          };

          currentConfig[roleMap[sub]] = subArgs.role.id;
          await db('guild_settings').where({ guild_id: guildId }).update({ config: JSON.stringify(currentConfig) });

          const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setDescription(`**${sub.charAt(0).toUpperCase() + sub.slice(1)} role** set to ${subArgs.role}`);
          return interaction.reply({ embeds: [embed] });
        }

        case 'list': {
          const entries = Object.entries(currentConfig).filter(([, v]) => v);
          if (entries.length === 0) {
            const embed = new EmbedBuilder()
              .setColor(0xffa500)
              .setDescription('No settings have been configured yet.');
            return interaction.reply({ embeds: [embed] });
          }

          const formatted = entries.map(([key, value]) => {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (key.includes('channel')) return `**${label}:** <#${value}>`;
            if (key.includes('role')) return `**${label}:** <@&${value}>`;
            return `**${label}:** ${value}`;
          }).join('\n');

          const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle(`${guild.name} Settings`)
            .setDescription(formatted)
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        case 'reset': {
          if (subArgs.confirm !== 'yes') {
            const embed = new EmbedBuilder()
              .setColor(0xffa500)
              .setDescription('Are you sure? Type `!setup reset yes` to confirm.');
            return interaction.reply({ embeds: [embed], ephemeral: true });
          }

          await db('guild_settings').where({ guild_id: guildId }).update({ config: '{}' });

          const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setDescription('All server configuration has been **reset**.');
          return interaction.reply({ embeds: [embed] });
        }

        default: {
          const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription('Unknown subcommand.');
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
      }
    } catch (err) {
      console.error(err);
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription('An error occurred while processing setup.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
