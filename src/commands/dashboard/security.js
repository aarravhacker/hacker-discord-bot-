const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config');
const { getGuild } = require('../../db/guildRepository');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashsecurity')
    .setDescription('Security dashboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['dsec'],
  prefix: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    if (!guild) return;

    const guildConfig = await getGuild(guild.id);
    const db = getDB();

    const antinuke = guildConfig.antinuke_enabled;
    const antiraid = guildConfig.antiraid_enabled;
    const antibot = guildConfig.antibot_enabled;
    const antilink = guildConfig.antilink_enabled;
    const antispam = guildConfig.antispam_enabled;
    const lockdown = guildConfig.lockdown_enabled;

    const mainEmbed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle(`${guild.name} - Security Dashboard`)
      .setDescription('Server security overview and controls.')
      .addFields(
        { name: 'Anti-Nuke', value: antinuke ? '`ENABLED`' : '`DISABLED`', inline: true },
        { name: 'Anti-Raid', value: antiraid ? '`ENABLED`' : '`DISABLED`', inline: true },
        { name: 'Anti-Bot', value: antibot ? '`ENABLED`' : '`DISABLED`', inline: true },
        { name: 'Anti-Link', value: antilink ? '`ENABLED`' : '`DISABLED`', inline: true },
        { name: 'Anti-Spam', value: antispam ? '`ENABLED`' : '`DISABLED`', inline: true },
        { name: 'Lockdown', value: lockdown ? '`ACTIVE`' : '`INACTIVE`', inline: true }
      )
      .setTimestamp();

    const actionRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('dash_sec_action')
        .setPlaceholder('Select security action...')
        .addOptions([
          { label: 'Toggle Anti-Nuke', description: antinuke ? 'Currently ON' : 'Currently OFF', value: 'antinuke', emoji: '🛡️' },
          { label: 'Toggle Anti-Raid', description: antiraid ? 'Currently ON' : 'Currently OFF', value: 'antiraid', emoji: '⚔️' },
          { label: 'Toggle Anti-Bot', description: antibot ? 'Currently ON' : 'Currently OFF', value: 'antibot', emoji: '🤖' },
          { label: 'Toggle Anti-Link', description: antilink ? 'Currently ON' : 'Currently OFF', value: 'antilink', emoji: '🔗' },
          { label: 'Toggle Anti-Spam', description: antispam ? 'Currently ON' : 'Currently OFF', value: 'antispam', emoji: '💬' },
          { label: 'Lock Server', description: lockdown ? 'Unlock server' : 'Lock server', value: 'lockdown', emoji: '🔒' },
          { label: 'Security Report', description: 'View security report', value: 'report', emoji: '📊' },
          { label: 'Whitelist List', description: 'View whitelisted users', value: 'whitelist', emoji: '✅' }
        ])
    );

    const response = await interaction.reply({ embeds: [mainEmbed], components: [actionRow], fetchReply: true });

    const filter = (i) => i.user.id === user.id;
    const collector = response.createMessageComponentCollector({ filter, time: 300000 });

    collector.on('collect', async (i) => {
      try {
        const action = i.values[0];
        const gc = await getGuild(guild.id);

        if (action === 'antinuke') {
          gc.antinuke_enabled = !gc.antinuke_enabled;
          await db('guilds').where({ guild_id: guild.id }).update({ antinuke_enabled: gc.antinuke_enabled });
          const embed = new EmbedBuilder()
            .setColor(gc.antinuke_enabled ? 0x00ff00 : 0xff0000)
            .setTitle(`Anti-Nuke ${gc.antinuke_enabled ? 'Enabled' : 'Disabled'}`)
            .setTimestamp();
          await i.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        if (action === 'antiraid') {
          gc.antiraid_enabled = !gc.antiraid_enabled;
          await db('guilds').where({ guild_id: guild.id }).update({ antiraid_enabled: gc.antiraid_enabled });
          const embed = new EmbedBuilder()
            .setColor(gc.antiraid_enabled ? 0x00ff00 : 0xff0000)
            .setTitle(`Anti-Raid ${gc.antiraid_enabled ? 'Enabled' : 'Disabled'}`)
            .setTimestamp();
          await i.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        if (action === 'antibot') {
          gc.antibot_enabled = !gc.antibot_enabled;
          await db('guilds').where({ guild_id: guild.id }).update({ antibot_enabled: gc.antibot_enabled });
          const embed = new EmbedBuilder()
            .setColor(gc.antibot_enabled ? 0x00ff00 : 0xff0000)
            .setTitle(`Anti-Bot ${gc.antibot_enabled ? 'Enabled' : 'Disabled'}`)
            .setTimestamp();
          await i.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        if (action === 'antilink') {
          gc.antilink_enabled = !gc.antilink_enabled;
          await db('guilds').where({ guild_id: guild.id }).update({ antilink_enabled: gc.antilink_enabled });
          const embed = new EmbedBuilder()
            .setColor(gc.antilink_enabled ? 0x00ff00 : 0xff0000)
            .setTitle(`Anti-Link ${gc.antilink_enabled ? 'Enabled' : 'Disabled'}`)
            .setTimestamp();
          await i.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        if (action === 'antispam') {
          gc.antispam_enabled = !gc.antispam_enabled;
          await db('guilds').where({ guild_id: guild.id }).update({ antispam_enabled: gc.antispam_enabled });
          const embed = new EmbedBuilder()
            .setColor(gc.antispam_enabled ? 0x00ff00 : 0xff0000)
            .setTitle(`Anti-Spam ${gc.antispam_enabled ? 'Enabled' : 'Disabled'}`)
            .setTimestamp();
          await i.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        if (action === 'lockdown') {
          gc.lockdown_enabled = !gc.lockdown_enabled;
          await db('guilds').where({ guild_id: guild.id }).update({ lockdown_enabled: gc.lockdown_enabled });

          const everyone = guild.roles.everyone;
          const currentPerms = everyone.permissions;

          if (gc.lockdown_enabled) {
            await everyone.setPermissions(currentPerms.remove('SendMessages'), `Lockdown by ${user.tag}`);
          } else {
            await everyone.setPermissions(currentPerms.add('SendMessages'), `Unlocked by ${user.tag}`);
          }

          const embed = new EmbedBuilder()
            .setColor(gc.lockdown_enabled ? 0xff0000 : 0x00ff00)
            .setTitle(gc.lockdown_enabled ? 'Server Locked' : 'Server Unlocked')
            .setTimestamp();
          await i.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        if (action === 'report') {
          const members = guild.memberCount;
          const bots = guild.members.cache.filter(m => m.user.bot).size;
          const admins = guild.members.cache.filter(m => m.permissions.has('Administrator')).size;

          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('Security Report')
            .addFields(
              { name: 'Members', value: `\`${members}\` total, \`${bots}\` bots, \`${admins}\` admins`, inline: false },
              { name: 'Protections', value: [
                `Anti-Nuke: ${antinuke ? '🟢' : '🔴'}`,
                `Anti-Raid: ${antiraid ? '🟢' : '🔴'}`,
                `Anti-Bot: ${antibot ? '🟢' : '🔴'}`,
                `Anti-Link: ${antilink ? '🟢' : '🔴'}`,
                `Anti-Spam: ${antispam ? '🟢' : '🔴'}`,
                `Lockdown: ${lockdown ? '🔴 ACTIVE' : '🟢 OFF'}`
              ].join('\n'), inline: false }
            )
            .setTimestamp();
          await i.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        if (action === 'whitelist') {
          const wl = JSON.parse(gc.whitelist || '[]');
          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('Whitelisted Users')
            .setDescription(wl.length ? wl.map(id => `<@${id}> \`${id}\``).join('\n') : 'No whitelisted users.')
            .setTimestamp();
          await i.reply({ embeds: [embed], ephemeral: true });
          return;
        }
      } catch (err) {
        console.error('Security dashboard error:', err);
      }
    });

    collector.on('end', () => {
      response.edit({ components: [] }).catch(() => {});
    });
  }
};
