const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');

const PUNISHMENT_TYPES = [
  { name: 'Remove Role', value: 'remove' },
  { name: 'Kick', value: 'kick' },
  { name: 'Ban', value: 'ban' },
  { name: 'Timeout', value: 'timeout' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockrole')
    .setDescription('Lock role system - prevent unauthorized role assignments')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Lock a role (prevent unauthorized assignment)')
        .addRoleOption(opt =>
          opt.setName('role').setDescription('The role to lock').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Unlock a role')
        .addRoleOption(opt =>
          opt.setName('role').setDescription('The role to unlock').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('Show all locked roles and configuration')
    )
    .addSubcommand(sub =>
      sub.setName('punishment')
        .setDescription('Set punishment for unauthorized role assignment')
        .addStringOption(opt =>
          opt.setName('type').setDescription('Punishment type').setRequired(true)
            .addChoices(...PUNISHMENT_TYPES)
        )
    )
    .addSubcommandGroup(group =>
      group.setName('whitelist')
        .setDescription('Manage the lockrole whitelist')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Add a role or user to the whitelist')
            .addRoleOption(opt =>
              opt.setName('role').setDescription('Role to whitelist')
            )
            .addUserOption(opt =>
              opt.setName('user').setDescription('User to whitelist')
            )
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a role or user from the whitelist')
            .addRoleOption(opt =>
              opt.setName('role').setDescription('Role to remove from whitelist')
            )
            .addUserOption(opt =>
              opt.setName('user').setDescription('User to remove from whitelist')
            )
        )
        .addSubcommand(sub =>
          sub.setName('reset')
            .setDescription('Clear the entire whitelist')
        )
        .addSubcommand(sub =>
          sub.setName('show')
            .setDescription('Show all whitelisted roles and users')
        )
    ),
  cooldown: 5,
  aliases: ['lr', 'lockedrole'],
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

    let group = null;
    let sub = null;
    let subArgs = {};

    if (isSlash) {
      group = interaction.options.getSubcommandGroup(false);
      sub = interaction.options.getSubcommand();
      if (sub === 'add' || sub === 'remove') {
        if (!group) {
          subArgs.role = interaction.options.getRole('role');
        } else {
          subArgs.role = interaction.options.getRole('role');
          subArgs.user = interaction.options.getUser('user');
        }
      }
      if (sub === 'punishment') {
        subArgs.type = interaction.options.getString('type');
      }
    } else {
      const cmdArgs = interaction.content.split(' ').slice(1);
      sub = cmdArgs[0]?.toLowerCase();
      if (sub === 'whitelist') {
        group = 'whitelist';
        sub = cmdArgs[1]?.toLowerCase();
        if (sub === 'add' || sub === 'remove') {
          const target = cmdArgs[2];
          if (target) {
            const roleId = target.replace(/[<>@&]/g, '');
            const role = guild.roles.cache.get(roleId);
            if (role) {
              subArgs.role = role;
            } else {
              const userId = target.replace(/[<>@!]/g, '');
              subArgs.user = guild.members.cache.get(userId)?.user;
            }
          }
        }
      } else if (sub === 'add' || sub === 'remove') {
        const target = cmdArgs[1];
        if (target) {
          const roleId = target.replace(/[<>@&]/g, '');
          subArgs.role = guild.roles.cache.get(roleId);
        }
      } else if (sub === 'punishment') {
        subArgs.type = cmdArgs[1]?.toLowerCase();
      }
    }

    try {
      let config = await db('lockrole_config').where({ guild_id: guildId }).first();
      if (!config) {
        await db('lockrole_config').insert({
          guild_id: guildId,
          locked_roles: '[]',
          punishment: 'remove',
          whitelist: '[]'
        });
        config = await db('lockrole_config').where({ guild_id: guildId }).first();
      }

      const lockedRoles = JSON.parse(config.locked_roles || '[]');
      const whitelist = JSON.parse(config.whitelist || '[]');

      if (!group) {
        switch (sub) {
          case 'add': {
            if (!subArgs.role) {
              const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setDescription('Usage: `!lockrole add <role>`');
              return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (lockedRoles.includes(subArgs.role.id)) {
              const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setDescription(`Role ${subArgs.role} is already locked.`);
              return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            lockedRoles.push(subArgs.role.id);
            await db('lockrole_config').where({ guild_id: guildId }).update({ locked_roles: JSON.stringify(lockedRoles) });

            const embed = new EmbedBuilder()
              .setColor(0x00ff00)
              .setDescription(`Role ${subArgs.role} is now **locked**. Unauthorized assignments will result in **${config.punishment}**.`);
            return interaction.reply({ embeds: [embed] });
          }

          case 'remove': {
            if (!subArgs.role) {
              const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setDescription('Usage: `!lockrole remove <role>`');
              return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const idx = lockedRoles.indexOf(subArgs.role.id);
            if (idx === -1) {
              const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setDescription(`Role ${subArgs.role} is not locked.`);
              return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            lockedRoles.splice(idx, 1);
            await db('lockrole_config').where({ guild_id: guildId }).update({ locked_roles: JSON.stringify(lockedRoles) });

            const embed = new EmbedBuilder()
              .setColor(0x00ff00)
              .setDescription(`Role ${subArgs.role} is now **unlocked**.`);
            return interaction.reply({ embeds: [embed] });
          }

          case 'show': {
            const roleEntries = lockedRoles.map(id => {
              const r = guild.roles.cache.get(id);
              return r ? `<@&${id}>` : `\`${id}\``;
            });

            const whitelistEntries = whitelist.map(entry => {
              if (entry.type === 'role') {
                const r = guild.roles.cache.get(entry.id);
                return r ? `Role: ${r}` : `Role: \`${entry.id}\``;
              } else {
                return `User: <@${entry.id}>`;
              }
            });

            const embed = new EmbedBuilder()
              .setColor(0x0099ff)
              .setTitle('Lock Role Configuration')
              .addFields(
                { name: 'Locked Roles', value: roleEntries.length > 0 ? roleEntries.join('\n') : 'None', inline: true },
                { name: 'Punishment', value: config.punishment || 'remove', inline: true },
                { name: 'Whitelist', value: whitelistEntries.length > 0 ? whitelistEntries.join('\n') : 'None', inline: true }
              )
              .setTimestamp();
            return interaction.reply({ embeds: [embed] });
          }

          case 'punishment': {
            if (!subArgs.type || !PUNISHMENT_TYPES.find(p => p.value === subArgs.type)) {
              const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setDescription('Usage: `!lockrole punishment <remove|kick|ban|timeout>`');
              return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            await db('lockrole_config').where({ guild_id: guildId }).update({ punishment: subArgs.type });

            const embed = new EmbedBuilder()
              .setColor(0x00ff00)
              .setDescription(`Punishment for unauthorized role assignment set to **${subArgs.type}**.`);
            return interaction.reply({ embeds: [embed] });
          }

          default: {
            const embed = new EmbedBuilder()
              .setColor(0xffa500)
              .setDescription('Unknown subcommand.');
            return interaction.reply({ embeds: [embed], ephemeral: true });
          }
        }
      } else if (group === 'whitelist') {
        switch (sub) {
          case 'add': {
            if (!subArgs.role && !subArgs.user) {
              const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setDescription('Usage: `!lockrole whitelist add <role|user>`');
              return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (subArgs.role) {
              const exists = whitelist.find(e => e.type === 'role' && e.id === subArgs.role.id);
              if (exists) {
                const embed = new EmbedBuilder()
                  .setColor(0xffa500)
                  .setDescription(`Role ${subArgs.role} is already whitelisted.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
              }
              whitelist.push({ type: 'role', id: subArgs.role.id });
            } else if (subArgs.user) {
              const exists = whitelist.find(e => e.type === 'user' && e.id === subArgs.user.id);
              if (exists) {
                const embed = new EmbedBuilder()
                  .setColor(0xffa500)
                  .setDescription(`User ${subArgs.user.tag} is already whitelisted.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
              }
              whitelist.push({ type: 'user', id: subArgs.user.id });
            }

            await db('lockrole_config').where({ guild_id: guildId }).update({ whitelist: JSON.stringify(whitelist) });

            const target = subArgs.role ? subArgs.role : subArgs.user;
            const embed = new EmbedBuilder()
              .setColor(0x00ff00)
              .setDescription(`${target} has been **added** to the whitelist.`);
            return interaction.reply({ embeds: [embed] });
          }

          case 'remove': {
            if (!subArgs.role && !subArgs.user) {
              const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setDescription('Usage: `!lockrole whitelist remove <role|user>`');
              return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            let idx = -1;
            if (subArgs.role) {
              idx = whitelist.findIndex(e => e.type === 'role' && e.id === subArgs.role.id);
            } else if (subArgs.user) {
              idx = whitelist.findIndex(e => e.type === 'user' && e.id === subArgs.user.id);
            }

            if (idx === -1) {
              const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setDescription('That entry is not in the whitelist.');
              return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            whitelist.splice(idx, 1);
            await db('lockrole_config').where({ guild_id: guildId }).update({ whitelist: JSON.stringify(whitelist) });

            const target = subArgs.role ? subArgs.role : subArgs.user;
            const embed = new EmbedBuilder()
              .setColor(0x00ff00)
              .setDescription(`${target} has been **removed** from the whitelist.`);
            return interaction.reply({ embeds: [embed] });
          }

          case 'reset': {
            await db('lockrole_config').where({ guild_id: guildId }).update({ whitelist: '[]' });

            const embed = new EmbedBuilder()
              .setColor(0x00ff00)
              .setDescription('The whitelist has been **cleared**.');
            return interaction.reply({ embeds: [embed] });
          }

          case 'show': {
            const entries = whitelist.map(entry => {
              if (entry.type === 'role') {
                const r = guild.roles.cache.get(entry.id);
                return r ? `Role: ${r}` : `Role: \`${entry.id}\``;
              } else {
                return `User: <@${entry.id}>`;
              }
            });

            const embed = new EmbedBuilder()
              .setColor(0x0099ff)
              .setTitle('Lockrole Whitelist')
              .setDescription(entries.length > 0 ? entries.join('\n') : 'No entries in the whitelist.')
              .setTimestamp();
            return interaction.reply({ embeds: [embed] });
          }

          default: {
            const embed = new EmbedBuilder()
              .setColor(0xffa500)
              .setDescription('Unknown whitelist subcommand.');
            return interaction.reply({ embeds: [embed], ephemeral: true });
          }
        }
      }
    } catch (err) {
      console.error(err);
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription('An error occurred while processing lockrole command.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
