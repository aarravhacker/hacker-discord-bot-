const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('Voice moderation commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
    .addSubcommand(sub => sub.setName('ban').setDescription('Ban a user from voice channels').addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)))
    .addSubcommand(sub => sub.setName('deafen').setDescription('Deafen a user').addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)))
    .addSubcommand(sub => sub.setName('deafenall').setDescription('Deafen all members in your voice channel'))
    .addSubcommand(sub => sub.setName('invite').setDescription('Invite a user to your voice channel').addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)))
    .addSubcommand(sub => sub.setName('kick').setDescription('Kick a user from voice channels').addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)))
    .addSubcommand(sub => sub.setName('kickall').setDescription('Kick all members from your voice channel'))
    .addSubcommand(sub => sub.setName('movelock').setDescription('Toggle move lock on your voice channel').addStringOption(opt => opt.setName('toggle').setDescription('enable or disable').addChoices({ name: 'enable', value: 'enable' }, { name: 'disable', value: 'disable' })))
    .addSubcommand(sub => sub.setName('mute').setDescription('Mute a user').addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)))
    .addSubcommand(sub => sub.setName('muteall').setDescription('Mute all members in your voice channel'))
    .addSubcommand(sub => sub.setName('pull').setDescription('Pull a user to your voice channel').addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)))
    .addSubcommand(sub => sub.setName('pullall').setDescription('Pull all members to your voice channel'))
    .addSubcommand(sub => sub.setName('request').setDescription('Request a user to join your voice channel').addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)))
    .addSubcommand(sub => sub.setName('undeafen').setDescription('Undeafen a user').addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)))
    .addSubcommand(sub => sub.setName('undeafenall').setDescription('Undeafen all members in your voice channel'))
    .addSubcommand(sub => sub.setName('unmute').setDescription('Unmute a user').addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)))
    .addSubcommand(sub => sub.setName('unmuteall').setDescription('Unmute all members in your voice channel')),

  name: 'voice',
  description: 'Voice moderation commands',
  usage: '!voice <ban|deafen|deafenall|invite|kick|kickall|movelock|mute|muteall|pull|pullall|request|undeafen|undeafenall|unmute|unmuteall> [user]',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const db = getDB();
    const member = interaction.member;

    if (!member.voice.channel) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You must be in a voice channel.')], ephemeral: true });
    }

    const vc = member.voice.channel;

    const perms = member.permissionsIn(vc);
    if (!perms.has(PermissionFlagsBits.MuteMembers) && !perms.has(PermissionFlagsBits.MoveMembers)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You lack permissions for this action.')], ephemeral: true });
    }

    const embed = new EmbedBuilder().setColor('#00FF00');

    switch (sub) {
      case 'ban': {
        const target = interaction.options.getMember('user');
        if (!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('User not found in this server.')], ephemeral: true });
        if (target.id === interaction.user.id) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You cannot ban yourself.')], ephemeral: true });

        await db('voice_bans').insert({ guild_id: interaction.guildId, user_id: target.id, banned_by: interaction.user.id }).onConflict(['guild_id', 'user_id']).merge();

        if (target.voice.channel) {
          await target.voice.disconnect().catch(() => {});
        }

        embed.setDescription(`🔇 ${target.user.tag} has been banned from voice channels.`);
        break;
      }

      case 'deafen': {
        const target = interaction.options.getMember('user');
        if (!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('User not found.')], ephemeral: true });
        if (!target.voice.channel) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Target is not in a voice channel.')], ephemeral: true });

        await target.voice.setDeaf(true).catch(() => {});
        embed.setDescription(`🔈 ${target.user.tag} has been deafened.`);
        break;
      }

      case 'deafenall': {
        const members = vc.members.filter(m => m.id !== interaction.user.id && !m.permissions.has(PermissionFlagsBits.MuteMembers));
        let count = 0;
        for (const [, m] of members) {
          await m.voice.setDeaf(true).catch(() => {});
          count++;
        }
        embed.setDescription(`🔈 Deafened ${count} member(s).`);
        break;
      }

      case 'invite': {
        const target = interaction.options.getMember('user');
        if (!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('User not found.')], ephemeral: true });
        if (target.voice.channel) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('User is already in a voice channel.')], ephemeral: true });

        await target.voice.setChannel(vc).catch(() => {});
        embed.setDescription(`📩 ${target.user.tag} has been invited to ${vc.name}.`);
        break;
      }

      case 'kick': {
        const target = interaction.options.getMember('user');
        if (!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('User not found.')], ephemeral: true });
        if (!target.voice.channel) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Target is not in a voice channel.')], ephemeral: true });

        await target.voice.disconnect().catch(() => {});
        embed.setDescription(`👢 ${target.user.tag} has been kicked from voice.`);
        break;
      }

      case 'kickall': {
        const members = vc.members.filter(m => m.id !== interaction.user.id && !m.permissions.has(PermissionFlagsBits.MuteMembers));
        let count = 0;
        for (const [, m] of members) {
          await m.voice.disconnect().catch(() => {});
          count++;
        }
        embed.setDescription(`👢 Kicked ${count} member(s) from voice.`);
        break;
      }

      case 'movelock': {
        const toggle = interaction.options.getString('toggle');
        if (toggle === 'enable') {
          await vc.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false }).catch(() => {});
          embed.setDescription('🔒 Move lock enabled. No one can join this channel.');
        } else {
          await vc.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: true }).catch(() => {});
          embed.setDescription('🔓 Move lock disabled. Everyone can join this channel.');
        }
        break;
      }

      case 'mute': {
        const target = interaction.options.getMember('user');
        if (!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('User not found.')], ephemeral: true });
        if (!target.voice.channel) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Target is not in a voice channel.')], ephemeral: true });

        await target.voice.setMute(true).catch(() => {});
        embed.setDescription(`🔇 ${target.user.tag} has been muted.`);
        break;
      }

      case 'muteall': {
        const members = vc.members.filter(m => m.id !== interaction.user.id && !m.permissions.has(PermissionFlagsBits.MuteMembers));
        let count = 0;
        for (const [, m] of members) {
          await m.voice.setMute(true).catch(() => {});
          count++;
        }
        embed.setDescription(`🔇 Muted ${count} member(s).`);
        break;
      }

      case 'pull': {
        const target = interaction.options.getMember('user');
        if (!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('User not found.')], ephemeral: true });
        if (target.voice.channel && target.voice.channel.id === vc.id) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('User is already in your channel.')], ephemeral: true });

        await target.voice.setChannel(vc).catch(() => {});
        embed.setDescription(`🪝 ${target.user.tag} has been pulled to ${vc.name}.`);
        break;
      }

      case 'pullall': {
        const guild = interaction.guild;
        const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice && c.id !== vc.id);
        let count = 0;
        for (const [, ch] of channels) {
          for (const [, m] of ch.members) {
            await m.voice.setChannel(vc).catch(() => {});
            count++;
          }
        }
        embed.setDescription(`🪝 Pulled ${count} member(s) to ${vc.name}.`);
        break;
      }

      case 'request': {
        const target = interaction.options.getMember('user');
        if (!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('User not found.')], ephemeral: true });
        if (target.voice.channel) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('User is already in a voice channel.')], ephemeral: true });

        try {
          await target.send({ embeds: [new EmbedBuilder().setColor('#FFFF00').setDescription(`📩 ${member.user.tag} requests you to join **${vc.name}** in **${interaction.guild.name}**.`)] });
          embed.setDescription(`📩 Request sent to ${target.user.tag}.`);
        } catch {
          embed.setColor('#FF0000').setDescription('Could not send request. User may have DMs disabled.');
        }
        break;
      }

      case 'undeafen': {
        const target = interaction.options.getMember('user');
        if (!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('User not found.')], ephemeral: true });

        await target.voice.setDeaf(false).catch(() => {});
        embed.setDescription(`🔊 ${target.user.tag} has been undeafened.`);
        break;
      }

      case 'undeafenall': {
        const members = vc.members.filter(m => m.voice.deaf);
        let count = 0;
        for (const [, m] of members) {
          await m.voice.setDeaf(false).catch(() => {});
          count++;
        }
        embed.setDescription(`🔊 Undeafened ${count} member(s).`);
        break;
      }

      case 'unmute': {
        const target = interaction.options.getMember('user');
        if (!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('User not found.')], ephemeral: true });

        await target.voice.setMute(false).catch(() => {});
        embed.setDescription(`🔊 ${target.user.tag} has been unmuted.`);
        break;
      }

      case 'unmuteall': {
        const members = vc.members.filter(m => m.voice.mute);
        let count = 0;
        for (const [, m] of members) {
          await m.voice.setMute(false).catch(() => {});
          count++;
        }
        embed.setDescription(`🔊 Unmuted ${count} member(s).`);
        break;
      }
    }

    return interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const sub = args[0];
    const db = getDB();
    const member = message.member;

    if (!member.voice.channel) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You must be in a voice channel.')] });
    }

    const vc = member.voice.channel;
    const perms = member.permissionsIn(vc);
    if (!perms.has(PermissionFlagsBits.MuteMembers) && !perms.has(PermissionFlagsBits.MoveMembers)) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('You lack permissions for this action.')] });
    }

    const embed = new EmbedBuilder().setColor('#00FF00');
    const targetMention = args[1];

    function getTarget() {
      if (!targetMention) return null;
      const id = targetMention.replace(/<!?@?|>/g, '');
      return message.guild.members.cache.get(id);
    }

    switch (sub) {
      case 'ban': {
        const target = getTarget();
        if (!target) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Provide a valid user.')] });
        await db('voice_bans').insert({ guild_id: message.guildId, user_id: target.id, banned_by: message.author.id }).onConflict(['guild_id', 'user_id']).merge();
        if (target.voice.channel) await target.voice.disconnect().catch(() => {});
        embed.setDescription(`🔇 ${target.user.tag} banned from voice.`);
        break;
      }
      case 'deafen': {
        const target = getTarget();
        if (!target || !target.voice.channel) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('User not found or not in voice.')] });
        await target.voice.setDeaf(true).catch(() => {});
        embed.setDescription(`🔈 ${target.user.tag} deafened.`);
        break;
      }
      case 'deafenall': {
        let count = 0;
        for (const [, m] of vc.members.filter(m => m.id !== message.author.id)) {
          await m.voice.setDeaf(true).catch(() => {});
          count++;
        }
        embed.setDescription(`🔈 Deafened ${count} member(s).`);
        break;
      }
      case 'invite': {
        const target = getTarget();
        if (!target) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Provide a valid user.')] });
        await target.voice.setChannel(vc).catch(() => {});
        embed.setDescription(`📩 ${target.user.tag} invited to ${vc.name}.`);
        break;
      }
      case 'kick': {
        const target = getTarget();
        if (!target || !target.voice.channel) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('User not found or not in voice.')] });
        await target.voice.disconnect().catch(() => {});
        embed.setDescription(`👢 ${target.user.tag} kicked from voice.`);
        break;
      }
      case 'kickall': {
        let count = 0;
        for (const [, m] of vc.members.filter(m => m.id !== message.author.id)) {
          await m.voice.disconnect().catch(() => {});
          count++;
        }
        embed.setDescription(`👢 Kicked ${count} member(s).`);
        break;
      }
      case 'movelock': {
        const toggle = args[1];
        if (toggle === 'enable') {
          await vc.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: false }).catch(() => {});
          embed.setDescription('🔒 Move lock enabled.');
        } else {
          await vc.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: true }).catch(() => {});
          embed.setDescription('🔓 Move lock disabled.');
        }
        break;
      }
      case 'mute': {
        const target = getTarget();
        if (!target || !target.voice.channel) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('User not found or not in voice.')] });
        await target.voice.setMute(true).catch(() => {});
        embed.setDescription(`🔇 ${target.user.tag} muted.`);
        break;
      }
      case 'muteall': {
        let count = 0;
        for (const [, m] of vc.members.filter(m => m.id !== message.author.id)) {
          await m.voice.setMute(true).catch(() => {});
          count++;
        }
        embed.setDescription(`🔇 Muted ${count} member(s).`);
        break;
      }
      case 'pull': {
        const target = getTarget();
        if (!target) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Provide a valid user.')] });
        await target.voice.setChannel(vc).catch(() => {});
        embed.setDescription(`🪝 ${target.user.tag} pulled to ${vc.name}.`);
        break;
      }
      case 'pullall': {
        let count = 0;
        for (const [, ch] of message.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice && c.id !== vc.id)) {
          for (const [, m] of ch.members) {
            await m.voice.setChannel(vc).catch(() => {});
            count++;
          }
        }
        embed.setDescription(`🪝 Pulled ${count} member(s) to ${vc.name}.`);
        break;
      }
      case 'request': {
        const target = getTarget();
        if (!target) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Provide a valid user.')] });
        try {
          await target.send({ embeds: [new EmbedBuilder().setColor('#FFFF00').setDescription(`📩 ${message.author.tag} requests you to join **${vc.name}** in **${message.guild.name}**.`)] });
          embed.setDescription(`📩 Request sent to ${target.user.tag}.`);
        } catch {
          embed.setColor('#FF0000').setDescription('Could not send request.');
        }
        break;
      }
      case 'undeafen': {
        const target = getTarget();
        if (!target) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Provide a valid user.')] });
        await target.voice.setDeaf(false).catch(() => {});
        embed.setDescription(`🔊 ${target.user.tag} undeafened.`);
        break;
      }
      case 'undeafenall': {
        let count = 0;
        for (const [, m] of vc.members.filter(m => m.voice.deaf)) {
          await m.voice.setDeaf(false).catch(() => {});
          count++;
        }
        embed.setDescription(`🔊 Undeafened ${count} member(s).`);
        break;
      }
      case 'unmute': {
        const target = getTarget();
        if (!target) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Provide a valid user.')] });
        await target.voice.setMute(false).catch(() => {});
        embed.setDescription(`🔊 ${target.user.tag} unmuted.`);
        break;
      }
      case 'unmuteall': {
        let count = 0;
        for (const [, m] of vc.members.filter(m => m.voice.mute)) {
          await m.voice.setMute(false).catch(() => {});
          count++;
        }
        embed.setDescription(`🔊 Unmuted ${count} member(s).`);
        break;
      }
      default:
        return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription(`Invalid subcommand. Usage: ${this.usage}`)] });
    }

    return message.reply({ embeds: [embed] });
  },
  adminOnly: true
};
