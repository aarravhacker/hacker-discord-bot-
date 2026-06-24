const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('securitygraph')
    .setDescription('Shows user relationships and network analysis')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('timewindow').setDescription('Time window in minutes for raid detection (1-60)').setMinValue(1).setMaxValue(60)
    ),
  cooldown: 5,
  aliases: ['secgraph', 'networkanalysis'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    try {
      let timeWindow = 300000;
      if (isSlash) {
        const minutes = interaction.options.getInteger('timewindow');
        if (minutes) timeWindow = minutes * 60000;
      } else {
        const argsList = interaction.content.split(' ').slice(1);
        const minutes = parseInt(argsList[0]);
        if (minutes && minutes > 0 && minutes <= 60) timeWindow = minutes * 60000;
      }

      const relationships = securityEngine.getRelationships(guild.id);
      const raidGroups = securityEngine.detectRaidGroup(guild.id, timeWindow);
      const altNetwork = securityEngine.detectAltNetwork(guild.id);

      const embed = new EmbedBuilder()
        .setTitle('🕸️ Security Network Analysis')
        .setDescription('User relationship graph and network analysis')
        .setColor(0x5865f2)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      if (raidGroups && raidGroups.length > 0) {
        let raidText = '';
        raidGroups.forEach((group, index) => {
          const memberList = group.map(m => `<@${m.userId}>`).join(', ');
          raidText += `**Group ${index + 1}** (${group.length} members)\n${memberList}\n\n`;
        });

        embed.addFields({
          name: `🚨 Raid Groups Detected (${raidGroups.length})`,
          value: raidText.substring(0, 1024) || 'None detected',
          inline: false
        });
        embed.setColor(0xff0000);
      } else {
        embed.addFields({
          name: '✅ Raid Groups',
          value: 'No raid groups detected in the specified time window.',
          inline: false
        });
      }

      if (altNetwork && altNetwork.length > 0) {
        const altList = altNetwork.map(m => {
          const profile = securityEngine.getProfile(guild.id, m.userId);
          return `<@${m.userId}> (Messages: ${profile.messageCount}, Age: ${Math.floor((Date.now() - profile.firstSeen) / 60000)}m)`;
        }).join('\n');

        embed.addFields({
          name: `🔍 Alt Network Detected (${altNetwork.length} accounts)`,
          value: altList.substring(0, 1024) || 'None detected',
          inline: false
        });
        embed.setColor(0xff6600);
      } else {
        embed.addFields({
          name: '✅ Alt Network',
          value: 'No suspicious alt accounts detected.',
          inline: false
        });
      }

      const totalConnections = relationships.size;
      let highRiskCount = 0;
      let lowTrustCount = 0;

      relationships.forEach((data) => {
        if (data.riskScore > 75) highRiskCount++;
        if (data.trustScore < 20) lowTrustCount++;
      });

      embed.addFields({
        name: '📊 Network Statistics',
        value: `**Total Profiles:** ${totalConnections}\n**High Risk (>75):** ${highRiskCount}\n**Low Trust (<20):** ${lowTrustCount}`,
        inline: true
      });

      embed.addFields({
        name: '⚙️ Analysis Settings',
        value: `**Time Window:** ${timeWindow / 60000} minutes\n**Method:** Join pattern + Activity analysis`,
        inline: true
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to perform network analysis.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};