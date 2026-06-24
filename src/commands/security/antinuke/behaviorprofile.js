const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('behaviorprofile')
    .setDescription('View user behavior profile')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to view profile for').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['bprofile', 'userprofile'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription('You need Administrator permission to use this command.');
      return interaction.reply({ embeds: [embed] });
    }

    let targetUser;
    if (isSlash) {
      targetUser = interaction.options.getUser('user');
    } else {
      const userId = (args[0] || '').replace(/[<@!>]/g, '');
      targetUser = userId ? await guild.members.fetch(userId).then(m => m.user).catch(() => null) : null;
    }

    if (!targetUser) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid User')
        .setDescription('Please specify a valid user.')
        .setColor(0xff0000)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      const profile = securityEngine.getProfile(guild.id, targetUser.id);
      const trustLevel = securityEngine.getTrustLevel(guild.id, targetUser.id);
      const risk = securityEngine.calculateRisk(guild.id, targetUser.id);

      const accountAge = Date.now() - targetUser.createdTimestamp;
      const memberAge = Date.now() - (profile.joinTime || Date.now());

      const formatDuration = (ms) => {
        const days = Math.floor(ms / 86400000);
        const hours = Math.floor((ms % 86400000) / 3600000);
        if (days > 0) return `${days}d ${hours}h`;
        return `${hours}h`;
      };

      let riskColor = 0x57f287;
      if (risk > 75) riskColor = 0xed4245;
      else if (risk > 50) riskColor = 0xffa500;
      else if (risk > 25) riskColor = 0xfee75c;

      const embed = new EmbedBuilder()
        .setTitle(`📋 Behavior Profile: ${targetUser.tag}`)
        .setDescription(`Behavioral analysis profile for **${targetUser.tag}**.`)
        .setColor(riskColor)
        .setTimestamp()
        .setThumbnail(targetUser.displayAvatarURL())
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
        .addFields(
          { name: '👤 Identity', value: `**Tag:** ${targetUser.tag}\n**ID:** ${targetUser.id}\n**Account Age:** ${formatDuration(accountAge)}`, inline: true },
          { name: '📊 Trust & Risk', value: `**Trust:** ${trustLevel.score}/100 (${trustLevel.label})\n**Risk:** ${risk}/100\n**Flagged:** ${trustLevel.isFlagged ? '⚠️ Yes' : '✅ No'}`, inline: true },
          { name: '⏱️ Membership', value: `**Member Since:** <t:${Math.floor(profile.joinTime / 1000)}:R>\n**Member Duration:** ${formatDuration(memberAge)}\n**Sessions:** ${profile.sessionCount || 0}`, inline: true }
        )
        .addFields(
          { name: '💬 Message Activity', value: `**Messages:** ${profile.messageCount}\n**Edits:** ${profile.editCount}\n**Deletes:** ${profile.deleteCount || 0}\n**Burst Count:** ${profile.burstCount}`, inline: true },
          { name: '🔧 Moderation Activity', value: `**Kicks:** ${profile.memberKicks}\n**Bans:** ${profile.memberBans}\n**Role Changes:** ${profile.roleChanges}\n**Channel Creates:** ${profile.channelCreates}`, inline: true },
          { name: '⚠️ Threat Indicators', value: `**Channel Deletes:** ${profile.channelDeletes}\n**Permission Escalations:** ${profile.permissionEscalations}\n**Anomalies:** ${profile.anomalies.length}\n**Last Activity:** <t:${Math.floor(profile.lastActivity / 1000)}:R>`, inline: true }
        );

      if (profile.anomalies.length > 0) {
        const recentAnomalies = profile.anomalies.slice(-5).map(a =>
          `• **${a.type}** (${a.severity})${a.count ? ` — Count: ${a.count}` : ''}`
        ).join('\n');
        embed.addFields({ name: '🚨 Recent Anomalies', value: recentAnomalies, inline: false });
      }

      if (profile.typicalChannels.size > 0) {
        const channels = [...profile.typicalChannels].slice(0, 5).map(id => `<#${id}>`).join(', ');
        embed.addFields({ name: '📍 Typical Channels', value: channels, inline: false });
      }

      if (profile.typicalHours.size > 0) {
        const hours = [...profile.typicalHours.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
        const hourList = hours.map(([h, count]) => `${h}:00 (${count} actions)`).join(', ');
        embed.addFields({ name: '🕐 Peak Hours', value: hourList, inline: false });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to load behavior profile.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
