const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('decoyintelligence')
    .setDescription('Decoy intelligence and analysis')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['decoyintel', 'dintel'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    try {
      if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription('You need Administrator permission to use this command.');
        return interaction.reply({ embeds: [embed] });
      }

      const decoys = securityEngine.getDecoys(guild.id);
      const incidents = securityEngine.getIncidents(guild.id, 500);
      const decoyIncidents = incidents.filter(i => i.type === 'decoy_triggered');

      const triggeredDecoys = decoys.filter(d => d.triggered);
      const activeDecoys = decoys.filter(d => !d.triggered);

      const triggerTimes = decoyIncidents.map(i => new Date(i.timestamp).getHours());
      const peakHour = triggerTimes.length > 0
        ? Object.entries(triggerTimes.reduce((acc, h) => { acc[h] = (acc[h] || 0) + 1; return acc; }, {}))
          .sort(([, a], [, b]) => b - a)[0]
        : null;

      const triggerUsers = {};
      decoyIncidents.forEach(i => {
        triggerUsers[i.userId] = (triggerUsers[i.userId] || 0) + 1;
      });
      const topTriggerUsers = Object.entries(triggerUsers)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      let color = 0x0099ff;
      if (triggeredDecoys.length > 0) color = 0xffa500;
      if (decoyIncidents.length > 10) color = 0xff0000;

      const embed = new EmbedBuilder()
        .setTitle('🪤 Decoy Intelligence')
        .setDescription('Intelligence analysis of decoy system activity.')
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      embed.addFields({
        name: '📊 Decoy Overview',
        value: `Total: **${decoys.length}**\nActive: **${activeDecoys.length}**\nTriggered: **${triggeredDecoys.length}**\nTotal Events: **${decoyIncidents.length}**`,
        inline: true
      });

      if (peakHour !== null) {
        embed.addFields({
          name: '🕐 Peak Trigger Time',
          value: `**${peakHour[0]}:00** (${peakHour[1]} triggers)`,
          inline: true
        });
      }

      const effectiveness = decoys.length > 0
        ? Math.round((triggeredDecoys.length / decoys.length) * 100)
        : 0;

      embed.addFields({
        name: '📈 Effectiveness',
        value: `Trigger Rate: **${effectiveness}%**\nAvg Triggers/Decoy: **${triggeredDecoys.length > 0 ? (decoyIncidents.length / triggeredDecoys.length).toFixed(1) : 0}**`,
        inline: true
      });

      if (topTriggerUsers.length > 0) {
        const userList = topTriggerUsers.map(([userId, count]) => {
          const member = guild.members.cache.get(userId);
          return `• **${member ? member.user.tag : userId}**: ${count} trigger(s)`;
        }).join('\n');

        embed.addFields({
          name: '⚠️ Top Trigger Users',
          value: userList,
          inline: false
        });
      }

      if (triggeredDecoys.length > 0) {
        const typeAnalysis = {};
        triggeredDecoys.forEach(d => {
          if (!typeAnalysis[d.type]) typeAnalysis[d.type] = { count: 0, totalTriggers: 0 };
          typeAnalysis[d.type].count++;
          typeAnalysis[d.type].totalTriggers += d.triggerCount;
        });

        const typeList = Object.entries(typeAnalysis)
          .map(([type, data]) => `• **${type}**: ${data.count} decoys, ${data.totalTriggers} triggers`)
          .join('\n');

        embed.addFields({
          name: '📋 Trigger Analysis by Type',
          value: typeList,
          inline: false
        });
      }

      const threatIntel = [];
      if (triggeredDecoys.length > 3) threatIntel.push('Multiple decoys triggered — coordinated reconnaissance likely');
      if (topTriggerUsers.some(([, c]) => c > 2)) threatIntel.push('Repeat trigger user detected — high-priority investigation recommended');
      if (peakHour && parseInt(peakHour[0]) >= 0 && parseInt(peakHour[0]) <= 5) threatIntel.push('Off-hours trigger activity detected — possible automated or stealth behavior');
      if (decoyIncidents.length > 10) threatIntel.push('Elevated trigger count — consider expanding decoy coverage');

      if (threatIntel.length > 0) {
        embed.addFields({
          name: '🚨 Threat Intelligence',
          value: threatIntel.map(t => `• ${t}`).join('\n'),
          inline: false
        });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while generating decoy intelligence.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
