const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('forensicexport')
    .setDescription('Export forensics data')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('type').setDescription('Data to export')
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Incidents', value: 'incidents' },
          { name: 'Snapshots', value: 'snapshots' },
          { name: 'Profiles', value: 'profiles' }
        )
    ),
  cooldown: 5,
  aliases: ['fexport', 'forensicexport'],
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

      const type = isSlash
        ? interaction.options.getString('type')
        : (args[0] || 'all').toLowerCase();

      const exportData = {
        guildId: guild.id,
        guildName: guild.name,
        exportedAt: new Date().toISOString(),
        exportedBy: user.tag,
        type: type
      };

      if (type === 'all' || type === 'incidents') {
        exportData.incidents = securityEngine.getIncidents(guild.id, 1000);
      }

      if (type === 'all' || type === 'snapshots') {
        const snapshots = await securityEngine.getSnapshots(guild.id);
        exportData.snapshots = snapshots || [];
      }

      if (type === 'all' || type === 'profiles') {
        const profiles = [];
        guild.members.cache.forEach(m => {
          if (m.user.bot) return;
          const profile = securityEngine.getProfile(guild.id, m.id);
          const risk = securityEngine.calculateRisk(guild.id, m.id);
          const trust = securityEngine.getTrustLevel(guild.id, m.id);
          profiles.push({
            userId: m.id,
            userTag: m.user.tag,
            riskScore: risk,
            trustLevel: trust,
            messageCount: profile.messageCount,
            channelCreates: profile.channelCreates,
            channelDeletes: profile.channelDeletes,
            roleChanges: profile.roleChanges,
            permissionEscalations: profile.permissionEscalations
          });
        });
        exportData.profiles = profiles;
      }

      exportData.summary = {
        totalIncidents: exportData.incidents?.length || 0,
        totalSnapshots: exportData.snapshots?.length || 0,
        totalProfiles: exportData.profiles?.length || 0,
        highRiskUsers: exportData.profiles?.filter(p => p.riskScore > 70).length || 0,
        unresolvedIncidents: exportData.incidents?.filter(i => !i.resolved).length || 0
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      const embed = new EmbedBuilder()
        .setTitle('📤 Forensics Data Export')
        .setDescription(`Exported **${type}** data for **${guild.name}**.`)
        .setColor(0x0099ff)
        .addFields(
          { name: 'Type', value: `**${type.toUpperCase()}**`, inline: true },
          { name: 'Incidents', value: `**${exportData.summary.totalIncidents}**`, inline: true },
          { name: 'Snapshots', value: `**${exportData.summary.totalSnapshots}**`, inline: true },
          { name: 'Profiles', value: `**${exportData.summary.totalProfiles}**`, inline: true },
          { name: 'High Risk Users', value: `**${exportData.summary.highRiskUsers}**`, inline: true },
          { name: 'Size', value: `**${(jsonString.length / 1024).toFixed(1)}** KB`, inline: true }
        )
        .setTimestamp();

      if (jsonString.length < 1900) {
        embed.addFields({
          name: '📋 Export Data',
          value: `\`\`\`json\n${jsonString}\n\`\`\``,
          inline: false
        });
      } else {
        embed.addFields({
          name: '📋 Export Ready',
          value: `Export data is **${(jsonString.length / 1024).toFixed(1)}** KB. Data exceeds embed limit — summary provided above.`,
          inline: false
        });
      }

      securityEngine.logIncident(guild.id, user.id, 'forensic_export', {
        type,
        incidentCount: exportData.summary.totalIncidents,
        size: jsonString.length
      });

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while exporting forensics data.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
