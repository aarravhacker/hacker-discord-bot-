const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashchannels')
    .setDescription('Channel management dashboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['dch'],
  prefix: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    if (!guild) return;

    const textChannels = guild.channels.cache
      .filter(c => c.type === 0)
      .sort((a, b) => a.position - b.position);

    const voiceChannels = guild.channels.cache
      .filter(c => c.type === 2)
      .sort((a, b) => a.position - b.position);

    const mainEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${guild.name} - Channel Manager`)
      .setDescription('Select a channel from the menu to manage it.')
      .addFields(
        {
          name: 'Text Channels',
          value: textChannels.map(c => {
            const tags = [];
            if (c.locked) tags.push('🔒');
            if (c.nsfw) tags.push('🔞');
            if (c.topic) tags.push('📝');
            return `${tags.join('')} ${c} \`${c.id}\``;
          }).join('\n').substring(0, 1024) || 'No text channels',
          inline: true
        },
        {
          name: 'Voice Channels',
          value: voiceChannels.map(c => {
            const members = c.members.size;
            return `🔊 ${c} \`${members} connected\``;
          }).join('\n').substring(0, 1024) || 'No voice channels',
          inline: true
        }
      )
      .setFooter({ text: `${textChannels.size} text • ${voiceChannels.size} voice` })
      .setTimestamp();

    const allChannels = [...textChannels.values(), ...voiceChannels.values()].slice(0, 25);

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('dash_ch_select')
        .setPlaceholder('Select a channel to manage...')
        .addOptions(
          allChannels.map(c => ({
            label: c.name.substring(0, 100),
            description: `${c.type === 0 ? 'Text' : 'Voice'} - ${c.id}`,
            value: c.id,
            emoji: c.type === 0 ? (c.locked ? '🔒' : '💬') : '🔊'
          }))
        )
    );

    const actionRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('dash_ch_action')
        .setPlaceholder('Select action...')
        .addOptions([
          { label: 'Lock', description: 'Lock this channel', value: 'lock', emoji: '🔒' },
          { label: 'Unlock', description: 'Unlock this channel', value: 'unlock', emoji: '🔓' },
          { label: 'Slowmode 5s', description: 'Set 5s slowmode', value: 'slow5', emoji: '⏱️' },
          { label: 'Slowmode 10s', description: 'Set 10s slowmode', value: 'slow10', emoji: '⏱️' },
          { label: 'Slowmode 30s', description: 'Set 30s slowmode', value: 'slow30', emoji: '⏱️' },
          { label: 'Slowmode Off', description: 'Remove slowmode', value: 'slow0', emoji: '⏱️' },
          { label: 'NSFW On', description: 'Enable NSFW', value: 'nsfw_on', emoji: '🔞' },
          { label: 'NSFW Off', description: 'Disable NSFW', value: 'nsfw_off', emoji: '🔞' },
          { label: 'Clone', description: 'Clone this channel', value: 'clone', emoji: '📋' },
          { label: 'Delete', description: 'Delete this channel', value: 'delete', emoji: '🗑️' }
        ])
    );

    const response = await interaction.reply({ embeds: [mainEmbed], components: [selectRow, actionRow], fetchReply: true });

    let selectedChannel = null;

    const filter = (i) => i.user.id === user.id;
    const collector = response.createMessageComponentCollector({ filter, time: 300000 });

    collector.on('collect', async (i) => {
      try {
        if (i.customId === 'dash_ch_select') {
          selectedChannel = i.values[0];
          const ch = guild.channels.cache.get(selectedChannel);
          if (!ch) return i.deferUpdate();

          const infoEmbed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`Channel: ${ch.name}`)
            .addFields(
              { name: 'ID', value: `\`${ch.id}\``, inline: true },
              { name: 'Type', value: ch.type === 0 ? 'Text' : 'Voice', inline: true },
              { name: 'Category', value: ch.parent ? `${ch.parent}` : 'None', inline: true },
              { name: 'Slowmode', value: `\`${ch.rateLimitPerUser || 0}s\``, inline: true },
              { name: 'NSFW', value: ch.nsfw ? '`Yes`' : '`No`', inline: true },
              { name: 'Locked', value: ch.locked ? '`Yes`' : '`No`', inline: true }
            )
            .setTimestamp();

          await i.update({ embeds: [infoEmbed], components: [selectRow, actionRow] });
          return;
        }

        if (i.customId === 'dash_ch_action') {
          if (!selectedChannel) return i.reply({ embeds: [
            new EmbedBuilder().setColor(0xff0000).setTitle('No Channel Selected').setDescription('Select a channel first from the menu above.')
          ], ephemeral: true });

          const ch = guild.channels.cache.get(selectedChannel);
          if (!ch) return i.reply({ embeds: [
            new EmbedBuilder().setColor(0xff0000).setTitle('Channel Not Found').setDescription('The selected channel no longer exists.')
          ], ephemeral: true });

          const action = i.values[0];

          if (action === 'lock') {
            await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
            await i.reply({ embeds: [
              new EmbedBuilder().setColor(0x00ff00).setTitle('Locked').setDescription(`${ch} has been locked.`)
            ], ephemeral: true });
            return;
          }

          if (action === 'unlock') {
            await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true });
            await i.reply({ embeds: [
              new EmbedBuilder().setColor(0x00ff00).setTitle('Unlocked').setDescription(`${ch} has been unlocked.`)
            ], ephemeral: true });
            return;
          }

          if (action.startsWith('slow')) {
            const seconds = parseInt(action.replace('slow', ''));
            await ch.setRateLimitPerUser(seconds, `Slowmode set by ${user.tag}`);
            await i.reply({ embeds: [
              new EmbedBuilder().setColor(0x00ff00).setTitle('Slowmode Updated').setDescription(`${ch} slowmode set to \`${seconds}s\``)
            ], ephemeral: true });
            return;
          }

          if (action === 'nsfw_on') {
            await ch.setNSFW(true, `NSFW enabled by ${user.tag}`);
            await i.reply({ embeds: [
              new EmbedBuilder().setColor(0x00ff00).setTitle('NSFW Enabled').setDescription(`${ch} is now NSFW.`)
            ], ephemeral: true });
            return;
          }

          if (action === 'nsfw_off') {
            await ch.setNSFW(false, `NSFW disabled by ${user.tag}`);
            await i.reply({ embeds: [
              new EmbedBuilder().setColor(0x00ff00).setTitle('NSFW Disabled').setDescription(`${ch} is no longer NSFW.`)
            ], ephemeral: true });
            return;
          }

          if (action === 'clone') {
            const cloned = await ch.clone();
            await i.reply({ embeds: [
              new EmbedBuilder().setColor(0x00ff00).setTitle('Cloned').setDescription(`Channel cloned: ${cloned}`)
            ], ephemeral: true });
            return;
          }

          if (action === 'delete') {
            await i.reply({ embeds: [
              new EmbedBuilder().setColor(0xff0000).setTitle('Deleted').setDescription(`${ch} has been deleted.`)
            ], ephemeral: true });
            await ch.delete(`Deleted by ${user.tag} via Dashboard`);
            return;
          }
        }
      } catch (err) {
        console.error('Channel dashboard error:', err);
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
