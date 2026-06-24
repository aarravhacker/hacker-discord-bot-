const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashmembers')
    .setDescription('Member management dashboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['dm'],
  prefix: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    if (!guild) return;

    const members = guild.members.cache
      .filter(m => !m.user.bot)
      .sort((a, b) => b.joinedTimestamp - a.joinedTimestamp)
      .first(25);

    const online = guild.members.cache.filter(m => m.presence?.status === 'online' && !m.user.bot).size;
    const idle = guild.members.cache.filter(m => m.presence?.status === 'idle' && !m.user.bot).size;
    const dnd = guild.members.cache.filter(m => m.presence?.status === 'dnd' && !m.user.bot).size;
    const offline = guild.members.cache.filter(m => (m.presence?.status === 'offline' || !m.presence) && !m.user.bot).size;

    const mainEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${guild.name} - Member Manager`)
      .setDescription('Select a member from the menu to manage them.')
      .addFields(
        { name: 'Status', value: `🟢 \`${online}\` | 🟡 \`${idle}\` | 🔴 \`${dnd}\` | ⚫ \`${offline}\``, inline: false },
        {
          name: 'Recent Members',
          value: members.map(m => {
            const status = getStatusEmoji(m);
            const roles = m.roles.cache.filter(r => r.id !== guild.id).sort((a, b) => b.position - a.position).first(3);
            return `${status} ${m.user.tag} ${roles.map(r => r).join(' ')}`;
          }).join('\n').substring(0, 1024),
          inline: false
        }
      )
      .setFooter({ text: `Showing ${members.length} of ${guild.memberCount - guild.members.cache.filter(m => m.user.bot).size} humans` })
      .setTimestamp();

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('dash_mem_select')
        .setPlaceholder('Select a member to manage...')
        .addOptions(
          members.map(m => ({
            label: m.user.tag.substring(0, 100),
            description: `ID: ${m.id} - ${getStatusText(m)}`,
            value: m.id,
            emoji: m.user.bot ? '🤖' : '👤'
          }))
        )
    );

    const actionRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('dash_mem_action')
        .setPlaceholder('Select action...')
        .addOptions([
          { label: 'Ban', description: 'Ban this member', value: 'ban', emoji: '🔨' },
          { label: 'Kick', description: 'Kick this member', value: 'kick', emoji: '👢' },
          { label: 'Mute', description: 'Mute this member', value: 'mute', emoji: '🔇' },
          { label: 'Unmute', description: 'Unmute this member', value: 'unmute', emoji: '🔊' },
          { label: 'Timeout 1min', description: 'Timeout for 1 minute', value: 'timeout1', emoji: '⏱️' },
          { label: 'Timeout 5min', description: 'Timeout for 5 minutes', value: 'timeout5', emoji: '⏱️' },
          { label: 'Timeout 10min', description: 'Timeout for 10 minutes', value: 'timeout10', emoji: '⏱️' },
          { label: 'Remove Timeout', description: 'Remove timeout', value: 'untimeout', emoji: '✅' },
          { label: 'Warn', description: 'Warn this member', value: 'warn', emoji: '⚠️' },
          { label: 'View Info', description: 'View member details', value: 'info', emoji: 'ℹ️' }
        ])
    );

    const response = await interaction.reply({ embeds: [mainEmbed], components: [selectRow, actionRow], fetchReply: true });

    let selectedMember = null;

    const filter = (i) => i.user.id === user.id;
    const collector = response.createMessageComponentCollector({ filter, time: 300000 });

    collector.on('collect', async (i) => {
      try {
        if (i.customId === 'dash_mem_select') {
          selectedMember = i.values[0];
          const member = guild.members.cache.get(selectedMember);
          if (!member) return i.deferUpdate();

          const roles = member.roles.cache
            .filter(r => r.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => r)
            .join(', ') || 'None';

          const infoEmbed = new EmbedBuilder()
            .setColor(member.displayHexColor || 0x5865f2)
            .setTitle(`${member.user.tag}`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
              { name: 'ID', value: `\`${member.id}\``, inline: true },
              { name: 'Status', value: getStatusText(member), inline: true },
              { name: 'Joined', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
              { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
              { name: 'Roles', value: roles.substring(0, 1024), inline: false },
              { name: 'Permissions', value: member.permissions.has('Administrator') ? '`Administrator`' : `\`${member.permissions.toArray().length} permissions\``, inline: true }
            )
            .setTimestamp();

          await i.update({ embeds: [infoEmbed], components: [selectRow, actionRow] });
          return;
        }

        if (i.customId === 'dash_mem_action') {
          if (!selectedMember) return i.reply({ embeds: [
            new EmbedBuilder().setColor(0xff0000).setTitle('No Member Selected').setDescription('Select a member first.')
          ], ephemeral: true });

          const member = guild.members.cache.get(selectedMember);
          if (!member) return i.reply({ embeds: [
            new EmbedBuilder().setColor(0xff0000).setTitle('Member Not Found').setDescription('The selected member is no longer in the server.')
          ], ephemeral: true });

          const action = i.values[0];

          if (action === 'ban') {
            await member.ban({ reason: `Banned by ${user.tag} via Dashboard` });
            await i.reply({ embeds: [
              new EmbedBuilder().setColor(0xff0000).setTitle('Banned').setDescription(`${member.user.tag} has been banned.`)
            ], ephemeral: true });
            return;
          }

          if (action === 'kick') {
            await member.kick(`Kicked by ${user.tag} via Dashboard`);
            await i.reply({ embeds: [
              new EmbedBuilder().setColor(0xff6600).setTitle('Kicked').setDescription(`${member.user.tag} has been kicked.`)
            ], ephemeral: true });
            return;
          }

          if (action === 'mute') {
            const muteRole = guild.roles.cache.find(r => r.name === 'Muted');
            if (muteRole) {
              await member.roles.add(muteRole, `Muted by ${user.tag} via Dashboard`);
              await i.reply({ embeds: [
                new EmbedBuilder().setColor(0x00ff00).setTitle('Muted').setDescription(`${member.user.tag} has been muted.`)
              ], ephemeral: true });
            } else {
              await i.reply({ embeds: [
                new EmbedBuilder().setColor(0xff0000).setTitle('No Mute Role').setDescription('Create a "Muted" role first.')
              ], ephemeral: true });
            }
            return;
          }

          if (action === 'unmute') {
            const muteRole = guild.roles.cache.find(r => r.name === 'Muted');
            if (muteRole) {
              await member.roles.remove(muteRole, `Unmuted by ${user.tag} via Dashboard`);
              await i.reply({ embeds: [
                new EmbedBuilder().setColor(0x00ff00).setTitle('Unmuted').setDescription(`${member.user.tag} has been unmuted.`)
              ], ephemeral: true });
            }
            return;
          }

          if (action.startsWith('timeout')) {
            const minutes = parseInt(action.replace('timeout', ''));
            const duration = minutes * 60 * 1000;
            await member.timeout(duration, `Timed out by ${user.tag} via Dashboard`);
            await i.reply({ embeds: [
              new EmbedBuilder().setColor(0xff6600).setTitle('Timed Out').setDescription(`${member.user.tag} timed out for ${minutes} minute(s).`)
            ], ephemeral: true });
            return;
          }

          if (action === 'untimeout') {
            await member.timeout(null, `Timeout removed by ${user.tag} via Dashboard`);
            await i.reply({ embeds: [
              new EmbedBuilder().setColor(0x00ff00).setTitle('Timeout Removed').setDescription(`Timeout removed from ${member.user.tag}.`)
            ], ephemeral: true });
            return;
          }

          if (action === 'warn') {
            const db = require('../../db/connection').getDB();
            const userData = await db('users').where({ user_id: member.id, guild_id: guild.id }).first();
            const warnings = userData ? JSON.parse(userData.warnings || '[]') : [];
            warnings.push({ reason: 'Warned via Dashboard', moderator: user.id, time: Date.now() });
            await db('users').where({ user_id: member.id, guild_id: guild.id }).update({ warnings: JSON.stringify(warnings) });
            await i.reply({ embeds: [
              new EmbedBuilder().setColor(0xffff00).setTitle('Warned').setDescription(`${member.user.tag} has been warned. (${warnings.length} total warnings)`)
            ], ephemeral: true });
            return;
          }

          if (action === 'info') {
            const roles = member.roles.cache
              .filter(r => r.id !== guild.id)
              .sort((a, b) => b.position - a.position)
              .map(r => r)
              .join(', ') || 'None';

            const infoEmbed = new EmbedBuilder()
              .setColor(member.displayHexColor || 0x5865f2)
              .setTitle(`${member.user.tag}`)
              .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
              .addFields(
                { name: 'ID', value: `\`${member.id}\``, inline: true },
                { name: 'Status', value: getStatusText(member), inline: true },
                { name: 'Joined', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Roles', value: roles.substring(0, 1024), inline: false }
              )
              .setTimestamp();

            await i.reply({ embeds: [infoEmbed], ephemeral: true });
            return;
          }
        }
      } catch (err) {
        console.error('Member dashboard error:', err);
        i.reply({ embeds: [
          new EmbedBuilder().setColor(0xff0000).setTitle('Error').setDescription(`Error: ${err.message}`)
        ], ephemeral: true }).catch(() => {});
      }
    });

    collector.on('end', () => {
      response.edit({ components: [] }).catch(() => {});
    });
  }
};

function getStatusEmoji(member) {
  if (!member.presence) return '⚫';
  switch (member.presence.status) {
    case 'online': return '🟢';
    case 'idle': return '🟡';
    case 'dnd': return '🔴';
    default: return '⚫';
  }
}

function getStatusText(member) {
  if (!member.presence) return 'Offline';
  switch (member.presence.status) {
    case 'online': return 'Online';
    case 'idle': return 'Idle';
    case 'dnd': return 'Do Not Disturb';
    default: return 'Offline';
  }
}
