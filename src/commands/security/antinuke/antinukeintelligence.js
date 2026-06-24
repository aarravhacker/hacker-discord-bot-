const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukeintelligence')
    .setDescription('Threat intelligence feed for antinuke')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('action')
        .setDescription('Action to perform')
        .setRequired(false)
        .addChoices(
          { name: 'View Feed', value: 'feed' },
          { name: 'Add Indicator', value: 'add' },
          { name: 'Remove Indicator', value: 'remove' },
          { name: 'Sync', value: 'sync' }
        )
    ),

  cooldown: 10,
  aliases: ['anintelligence', 'aintel'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Permission Denied')
        .setDescription('You need Administrator permission to use this command.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    const action = isSlash ? (interaction.options.getString('action') || 'feed') : (args[0] || 'feed');

    try {
      await interaction.deferReply();

      if (action === 'feed') {
        const feed = await securityEngine.getThreatIntelligence(interaction.guild.id);
        const threats = feed?.threats || [];

        const embed = new EmbedBuilder()
          .setColor(0x9900ff)
          .setTitle('🧠 Threat Intelligence Feed')
          .setDescription(`Current threat intelligence for **${interaction.guild.name}**`)
          .setTimestamp();

        if (threats.length > 0) {
          const threatList = threats.slice(0, 10).map(t =>
            `\`${t.severity.toUpperCase()}\` ${t.description} - ${t.timestamp}`
          ).join('\n');
          embed.addFields({ name: 'Recent Threats', value: threatList });
        } else {
          embed.addFields({ name: 'Threats', value: 'No recent threats detected.' });
        }

        embed.addFields(
          { name: 'Known Attackers', value: String(feed?.knownAttackers || 0), inline: true },
          { name: 'Blocked IPs', value: String(feed?.blockedIPs || 0), inline: true },
          { name: 'Last Sync', value: feed?.lastSync || 'Never', inline: true }
        );

        return interaction.editReply({ embeds: [embed] });
      }

      if (action === 'add') {
        const indicator = isSlash ? interaction.options.getString('indicator') : args[1];
        if (!indicator) {
          const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle('⚠️ Missing Indicator')
            .setDescription('Please provide a threat indicator to add.')
            .setTimestamp();
          return interaction.editReply({ embeds: [embed] });
        }
        await securityEngine.addThreatIndicator(interaction.guild.id, indicator);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('🧠 Threat Indicator Added')
          .setDescription(`Added indicator: \`${indicator}\``)
          .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      }

      if (action === 'remove') {
        const indicator = isSlash ? interaction.options.getString('indicator') : args[1];
        if (!indicator) {
          const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle('⚠️ Missing Indicator')
            .setDescription('Please provide a threat indicator to remove.')
            .setTimestamp();
          return interaction.editReply({ embeds: [embed] });
        }
        await securityEngine.removeThreatIndicator(interaction.guild.id, indicator);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('🧠 Threat Indicator Removed')
          .setDescription(`Removed indicator: \`${indicator}\``)
          .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      }

      if (action === 'sync') {
        const result = await securityEngine.syncThreatIntelligence(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('🧠 Intelligence Synced')
          .setDescription(result?.message || 'Threat intelligence has been synced.')
          .addFields(
            { name: 'New Threats', value: String(result?.newThreats || 0), inline: true },
            { name: 'Updated', value: String(result?.updated || 0), inline: true }
          )
          .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Intelligence Error')
        .setDescription(`Intelligence operation failed: ${error.message}`)
        .setTimestamp();
      if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
      }
      return interaction.reply({ embeds: [embed] });
    }
  }
};
