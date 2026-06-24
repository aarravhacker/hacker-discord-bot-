const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdownintelligence')
    .setDescription('Lockdown intelligence and threat analysis')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['ldintel', 'lockdownintel'],
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

    try {
      const incidents = securityEngine.getIncidents(guild.id, 100);
      const stage = securityEngine.getStage(guild.id);
      const joinVelocity = securityEngine.analyzeJoinVelocity(guild.id, 300000);
      const raidGroup = securityEngine.detectRaidGroup(guild.id);
      const altNetwork = securityEngine.detectAltNetwork(guild.id);
      const decoys = securityEngine.getDecoys(guild.id);

      const threatActors = [];
      const memberProfiles = [...securityEngine.profiles.values()].filter(p => p.guildId === guild.id);

      for (const profile of memberProfiles) {
        const risk = securityEngine.calculateRisk(guild.id, profile.userId);
        if (risk > 60) {
          const trust = securityEngine.getTrustLevel(guild.id, profile.userId);
          threatActors.push({
            userId: profile.userId,
            risk,
            trust: trust.level,
            label: trust.label,
            anomalies: profile.anomalies.length,
            channelDeletes: profile.channelDeletes,
            memberBans: profile.memberBans
          });
        }
      }

      threatActors.sort((a, b) => b.risk - a.risk);

      const embed = new EmbedBuilder()
        .setTitle('🧠 Lockdown Intelligence')
        .setDescription('Threat intelligence and lockdown analysis.')
        .setColor(0xed4245)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
        .addFields(
          { name: 'Current Stage', value: `**${stage.name}** (${stage.stage})`, inline: true },
          { name: 'Join Velocity', value: `${joinVelocity.count} in 5m (${joinVelocity.riskLevel})`, inline: true },
          { name: 'Decoys Active', value: `${decoys.length}`, inline: true }
        );

      if (raidGroup) {
        embed.addFields({
          name: '🚨 Raid Activity',
          value: `Detected **${raidGroup.length}** raid group(s) with **${raidGroup.flat().length}** total members.`,
          inline: false
        });
      }

      if (altNetwork) {
        embed.addFields({
          name: '🕵️ Alt Network',
          value: `Detected **${altNetwork.length}** potential alt accounts.`,
          inline: false
        });
      }

      if (threatActors.length > 0) {
        const actorList = threatActors.slice(0, 5).map((actor, i) => {
          let riskEmoji = '🟢';
          if (actor.risk > 75) riskEmoji = '🔴';
          else if (actor.risk > 50) riskEmoji = '🟠';
          else if (actor.risk > 25) riskEmoji = '🟡';

          return `**${i + 1}.** <@${actor.userId}> — Risk: ${riskEmoji} **${actor.risk}** | Trust: Lvl ${actor.trust} (${actor.label}) | Anomalies: ${actor.anomalies}`;
        }).join('\n');
        embed.addFields({ name: '⚠️ High-Risk Actors', value: actorList, inline: false });
      } else {
        embed.addFields({ name: '✅ Threat Actors', value: 'No high-risk actors detected.', inline: false });
      }

      const recommendations = securityEngine.generateRecommendations(guild.id, incidents);
      if (recommendations.length > 0) {
        const recs = recommendations.map(r => `• ${r}`).join('\n');
        embed.addFields({ name: '💡 Intelligence Recommendations', value: recs, inline: false });
      }

      securityEngine.logIncident(guild.id, user.id, 'lockdown_intelligence_viewed', {
        threatActors: threatActors.length,
        raidGroup: !!raidGroup,
        altNetwork: !!altNetwork
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to load lockdown intelligence.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
